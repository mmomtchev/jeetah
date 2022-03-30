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
  : Napi::ObjectWrap<Jeetah<T>>::ObjectWrap(info), evalCode(nullptr), evalFunc(nullptr) {
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

template <typename T> Napi::Value Jeetah<T>::Eval(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (evalCode == nullptr) {
    Napi::Function compile = GetJSRoutine(env, "compile");
    Napi::Value object = compile({jsFn.Value(), Napi::String::New(env, NapiArrayType<T>::name)});
    if (!object.IsObject()) throw Napi::Error::New(env, "Compilation failed");
    std::string nameFn = "_f_" + object.ToObject().Get("name").ToString().Utf8Value();
    std::string nameModule = "m_" + object.ToObject().Get("name").ToString().Utf8Value();
    arguments = object.ToObject().Get("params").ToObject().GetPropertyNames().Length();

    MIR_scan_string(ctx, object.ToObject().Get("mirText").ToString().Utf8Value().c_str());
    MIR_module_t evalModule = nullptr;
    for (MIR_module_t m = DLIST_HEAD(MIR_module_t, *MIR_get_module_list(ctx)); m != nullptr; m = DLIST_NEXT(MIR_module_t, m))
      if (strcmp(m->name, nameModule.c_str()) == 0) {
          evalModule = m;
          break;
      }
    if (evalModule == nullptr) throw Napi::Error::New(env, "Compilation failed");

    for (MIR_item_t f = DLIST_HEAD(MIR_item_t, evalModule->items); f != nullptr; f = DLIST_NEXT(MIR_item_t, f))
      if (f->item_type == MIR_func_item && strcmp(f->u.func->name, nameFn.c_str()) == 0) {
        evalCode = f;
        break;
      }
    if (evalCode == nullptr) throw Napi::Error::New(env, "Compilation failed");

    MIR_load_module(ctx, evalModule);
    MIR_link(ctx, MIR_set_gen_interface, nullptr);
    evalFunc = MIR_gen(ctx, 0, evalCode);
  }

  T r = T(0);

  switch (arguments) {
    case 0: {
      auto fn = reinterpret_cast<T (*)()>(evalFunc);
      r = fn();
    } break;
    case 1: {
      auto fn = reinterpret_cast<T (*)(double)>(evalFunc);
      if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Missing mandatory number argument");
      r = fn(info[0].ToNumber().DoubleValue());
    } break;
    case 2: {
      auto fn = reinterpret_cast<T (*)(double, double)>(evalFunc);
      if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
        throw Napi::TypeError::New(env, "Missing mandatory number argument");
      r = fn(info[0].ToNumber().DoubleValue(), info[1].ToNumber().DoubleValue());
    } break;
  }

  return Napi::Number::New(env, r);
}

template <typename T> Napi::Function Jeetah<T>::GetClass(Napi::Env env) {
  return Napi::ObjectWrap<Jeetah<T>>::DefineClass(
    env,
    "Jeetah",
    {
      Napi::ObjectWrap<Jeetah<T>>::InstanceMethod("eval", &Jeetah::Eval),
    });
}

template <typename T> Napi::Function Jeetah<T>::GetJSRoutine(Napi::Env env, const char *name) {
  Napi::Value JSRoutines = env.Global().Get("Jeetah");
  if (!JSRoutines.IsObject())
    throw Napi::Error::New(env, "Jeetah object not present?");
  Napi::Value fn = JSRoutines.ToObject().Get(name);
  if (!fn.IsFunction())
    throw Napi::Error::New(env, "Jeetah object not initialized?");
  return fn.As<Napi::Function>();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "Float64Expression"), Jeetah<double>::GetClass(env));
  exports.Set(Napi::String::New(env, "Float32Expression"), Jeetah<float>::GetClass(env));
  return exports;
}

NODE_API_MODULE(jeetah, Init)

}; // namespace jeetah