{
  'targets': [
    {
      'target_name': 'mir',
      'type': 'static_library',
      'sources': [
           'mir/mir.c',
           'mir/mir-gen.c'
      ],
      'include_dirs': [ 'mir' ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      # People who design compiler obiously consider
      # that these do not apply to them
      'cflags': [
          '-Wno-abi',
          '-Wno-clobbered',
          '-Wno-empty-body',
          '-Wno-type-limits',
          '-Wno-sign-compare',
          '-Wno-unused-function',
          '-Wno-unused-variable',
          '-Wno-implicit-fallthrough',
          '-Wno-missing-field-initializers',
          '-fsigned-char',
          '-fno-tree-sra',
          '-fno-ipa-cp-clone'
      ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7'
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      },
      'direct_dependent_settings': {
          'include_dirs': [
              'mir'
          ]
      }
    }
  ]
}