#include "mirobj.h"

using namespace Napi;

MIR::MIR(const Napi::CallbackInfo &info) : ObjectWrap(info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        throw Napi::TypeError::New(env, "No code argument");
    }

    if (info.Length() < 2 || !info[1].IsString()) {
        throw Napi::TypeError::New(env, "No type argument");
    }
    auto sType = info[1].ToString().Utf8Value();
    if (sType == "Float64")
        type = Float64;
    else if (sType == "Float32")
        type = Float32;
    else
        throw Napi::TypeError::New(env, "Unsupported type");

    if (info.Length() < 3 || !info[2].IsNumber()) {
        throw Napi::TypeError::New(env, "No parameters number argument");
    }
    arguments = info[2].ToNumber().Uint32Value();

    ctx = MIR_init();
    mir = info[0].ToString().Utf8Value();
    MIR_scan_string(ctx, mir.c_str());
    module = DLIST_HEAD(MIR_module_t, *MIR_get_module_list(ctx));
    MIR_load_module(ctx, module);

    item = nullptr;
    for (MIR_item_t f = DLIST_HEAD(MIR_item_t, module->items); f != nullptr; f = DLIST_NEXT(MIR_item_t, f))
        if (f->item_type == MIR_func_item)
            item = f;

    if (item == nullptr)
        throw Napi::TypeError::New(env, "Compilation failed");

    MIR_gen_init(ctx, 1);
    MIR_gen_set_optimize_level(ctx, 1, 3);
    MIR_link(ctx, MIR_set_gen_interface, nullptr);
    text = MIR_gen(ctx, 0, item);
}

template <typename T> T MIR::RunWithType(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    T r = T(0);

    switch (arguments) {
    case 0: {
        auto fn = reinterpret_cast<T (*)()>(text);
        r = fn();
    } break;
    case 1: {
        auto fn = reinterpret_cast<T (*)(double)>(text);
        if (info.Length() < 1 || !info[0].IsNumber())
            throw Napi::TypeError::New(env, "Missing mandatory number argument");
        r = fn(info[0].ToNumber().DoubleValue());
    } break;
    case 2: {
        auto fn = reinterpret_cast<T (*)(double, double)>(text);
        if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
            throw Napi::TypeError::New(env, "Missing mandatory number argument");
        r = fn(info[0].ToNumber().DoubleValue(), info[1].ToNumber().DoubleValue());
    } break;
    }
    return r;
}

Napi::Value MIR::Run(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    switch (type) {
    case Float64:
        return Napi::Number::New(env, RunWithType<double>(info));
    case Float32:
        return Napi::Number::New(env, RunWithType<float>(info));
    }
    return env.Undefined();
}

Napi::Function MIR::GetClass(Napi::Env env) {
    return DefineClass(env, "MIR",
                       {
                           MIR::InstanceMethod("Run", &MIR::Run),
                       });
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::String name = Napi::String::New(env, "MIR");
    exports.Set(name, MIR::GetClass(env));
    return exports;
}

NODE_API_MODULE(mir, Init)
