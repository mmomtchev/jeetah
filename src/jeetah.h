#pragma once

#include <mir-gen.h>
#include <mir.h>
#include <napi.h>

namespace jeetah {

enum VarType { Float64 = 0, Float32 = 1 };

template <typename T>
class Jeetah : public Napi::ObjectWrap<Jeetah<T>> {
  public:
    Jeetah(const Napi::CallbackInfo &);
    virtual ~Jeetah();

    Napi::Value Eval(const Napi::CallbackInfo &);
    Napi::Value Map(const Napi::CallbackInfo &);

    static Napi::Function GetClass(Napi::Env);

  private:
    using JITFn = T (*)(...);
    static Napi::Function GetJSRoutine(Napi::Env, const char*);
    JITFn AssemblyAndLink(Napi::Env, Napi::Value);

    MIR_context_t ctx;
    Napi::FunctionReference jsFn;
    size_t arguments;

    JITFn evalFunc;
    JITFn mapFunc;
};
}; // namespace jeetah