#pragma once

#include <mir-gen.h>
#include <mir.h>
#include <napi.h>

enum VarType {
  Float64 = 0,
  Float32 = 1
};

class MIR : public Napi::ObjectWrap<MIR> {
  public:
    MIR(const Napi::CallbackInfo &);
    virtual ~MIR();
    template <typename T> T RunWithType(const Napi::CallbackInfo &);
    Napi::Value Run(const Napi::CallbackInfo &);

    static Napi::Function GetClass(Napi::Env);

  private:
    VarType type;
    size_t arguments;
    std::string mir;
    MIR_context_t ctx;
    MIR_module_t module;
    MIR_item_t item;
    void *text;
};
