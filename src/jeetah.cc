#include "types.h"
#include "jeetah.h"
#include <cmath>
#include <functional>
#include <map>

namespace jeetah {

// Never expose templated variables to the linker - MSVC is capable of unimaginable feats when building them
template <typename T>
static std::map<std::string, void *> builtins = {
  {"cos", reinterpret_cast<void *>(static_cast<T (*)(T)>(std::cos))},
  {"sin", reinterpret_cast<void *>(static_cast<T (*)(T)>(std::sin))},
  {"sqrt", reinterpret_cast<void *>(static_cast<T (*)(T)>(std::sqrt))},
  {"pow", reinterpret_cast<void *>(static_cast<T (*)(T, T)>(std::pow))},
  {"exp", reinterpret_cast<void *>(static_cast<T (*)(T)>(std::exp))},
  {"log", reinterpret_cast<void *>(static_cast<T (*)(T)>(std::log))}};

template <typename T>
Jeetah<T>::Jeetah(const Napi::CallbackInfo &info)
  : Napi::ObjectWrap<Jeetah<T>>::ObjectWrap(info), evalFunc(nullptr), mapFunc(nullptr) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsFunction()) { throw Napi::TypeError::New(env, "No function argument"); }

  jsFn = Napi::Persistent(info[0].As<Napi::Function>());

  ctx = MIR_init();
  MIR_gen_init(ctx, 0);
  MIR_gen_set_optimize_level(ctx, 0, 3);
  for (auto const &symbol : builtins<T>) { MIR_load_external(ctx, symbol.first.c_str(), symbol.second); }
}

template <typename T> Jeetah<T>::~Jeetah() {
  MIR_gen_finish(ctx);
  MIR_finish(ctx);
}

template <typename T> typename Jeetah<T>::JITFn Jeetah<T>::AssemblyAndLink(Napi::Env env, Napi::Value object) {
  if (!object.IsObject()) throw Napi::Error::New(env, "Compilation failed");
  std::string nameFn = "_f_" + object.ToObject().Get("name").ToString().Utf8Value();
  std::string nameModule = "m_" + object.ToObject().Get("name").ToString().Utf8Value();
  arguments = object.ToObject().Get("params").ToObject().GetPropertyNames().Length();

  MIR_scan_string(ctx, object.ToObject().Get("mirText").ToString().Utf8Value().c_str());
  MIR_module_t module = nullptr;
  for (MIR_module_t m = DLIST_HEAD(MIR_module_t, *MIR_get_module_list(ctx)); m != nullptr;
       m = DLIST_NEXT(MIR_module_t, m))
    if (strcmp(m->name, nameModule.c_str()) == 0) {
      module = m;
      break;
    }
  if (module == nullptr) throw Napi::Error::New(env, "Compilation failed");

  MIR_item_t text = nullptr;
  for (MIR_item_t f = DLIST_HEAD(MIR_item_t, module->items); f != nullptr; f = DLIST_NEXT(MIR_item_t, f))
    if (f->item_type == MIR_func_item && strcmp(f->u.func->name, nameFn.c_str()) == 0) {
      text = f;
      break;
    }
  if (text == nullptr) throw Napi::Error::New(env, "Compilation failed");

  MIR_load_module(ctx, module);
  MIR_link(ctx, MIR_set_gen_interface, nullptr);
  return reinterpret_cast<JITFn>(MIR_gen(ctx, 0, text));
}

template <typename T> Napi::Value Jeetah<T>::Eval(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (evalFunc == nullptr) {
    Napi::Function compile = GetJSRoutine(env, "compile");
    Napi::Value object = compile({jsFn.Value(), Napi::String::New(env, NapiArrayType<T>::name)});
    evalFunc = AssemblyAndLink(env, object);
  }

  T r = T(0);

  switch (arguments) {
    case 0: {
      r = evalFunc();
    } break;
    case 1: {
      if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Missing mandatory number argument");
      r = evalFunc(info[0].ToNumber().DoubleValue());
    } break;
    case 2: {
      if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
        throw Napi::TypeError::New(env, "Missing mandatory number argument");
      r = evalFunc(info[0].ToNumber().DoubleValue(), info[1].ToNumber().DoubleValue());
    } break;
    default: throw Napi::TypeError::New(env, "Jeetah can't count to more than 2 yet");
  }

  return Napi::Number::New(env, r);
}

template <typename T> Napi::Value Jeetah<T>::Map(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[1].IsString()) throw Napi::TypeError::New(env, "Missing mandatory iterator argument");
  if (mapFunc == nullptr) {
    Napi::Function compile = GetJSRoutine(env, "compileMap");
    Napi::Value object = compile({jsFn.Value(), Napi::String::New(env, NapiArrayType<T>::name), info[1]});
    mapFunc = AssemblyAndLink(env, object);
  }

  Napi::TypedArray input = info[0].As<Napi::TypedArray>();
  size_t len = input.ElementLength();
  T *source = GetTypedArrayPtr<T>(input);
  Napi::TypedArray result = NapiArrayType<T>::New(env, len);
  T *target = GetTypedArrayPtr<T>(result);

  if (
    info.Length() < 1 || !info[0].IsTypedArray() ||
    info[0].As<Napi::TypedArray>().TypedArrayType() != NapiArrayType<T>::type)
    throw Napi::TypeError::New(env, "Missing mandatory TypedArray argument");
  mapFunc(source, target, source + len);

  return result;
}

template <typename T> Napi::Function Jeetah<T>::GetClass(Napi::Env env) {
  return Napi::ObjectWrap<Jeetah<T>>::DefineClass(
    env,
    "Jeetah",
    {
      Napi::ObjectWrap<Jeetah<T>>::InstanceMethod("eval", &Jeetah::Eval),
      Napi::ObjectWrap<Jeetah<T>>::InstanceMethod("map", &Jeetah::Map),
    });
}

template <typename T> Napi::Function Jeetah<T>::GetJSRoutine(Napi::Env env, const char *name) {
  Napi::Value JSRoutines = env.Global().Get("Jeetah");
  if (!JSRoutines.IsObject()) throw Napi::Error::New(env, "Jeetah object not present?");
  Napi::Value fn = JSRoutines.ToObject().Get(name);
  if (!fn.IsFunction()) throw Napi::Error::New(env, "Jeetah object not initialized?");
  return fn.As<Napi::Function>();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "Float64Expression"), Jeetah<double>::GetClass(env));
  exports.Set(Napi::String::New(env, "Float32Expression"), Jeetah<float>::GetClass(env));
  return exports;
}

NODE_API_MODULE(jeetah, Init)

}; // namespace jeetah