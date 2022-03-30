{
  'variables': {
    'enable_asan%': 'false',
    'enable_coverage%': 'false',
  },
  'target_defaults': {
    'cflags!': [ '-fno-exceptions', '-fno-rtti', '-fvisibility=default' ],
    'cflags_cc!': [ '-fno-exceptions', '-fno-rtti', '-fvisibility=default' ],
    'cflags_cc': [ '-fvisibility=hidden', '-std=c++14' ],
    'ldflags': [ '-Wl,-z,now' ],
    'xcode_settings': {
      'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
			'GCC_ENABLE_CPP_RTTI': 'YES',
      'CLANG_CXX_LIBRARY': 'libc++',
			'OTHER_CPLUSPLUSFLAGS': [
				'-frtti',
				'-fexceptions',
        '-std=c++14'
			]
    },
    'msvs_settings': {
      'VCCLCompilerTool': {
        'AdditionalOptions': [
          '/MP',
          '/GR',
          '/EHsc',
          '/std:c++14'
        ],
        'ExceptionHandling': 1,
        'RuntimeTypeInfo': 'true'
      }
    },
    'configurations': {
      'Debug': {
        'cflags_cc!': [ '-O3', '-Os' ],
        'defines': [ 'DEBUG' ],
        'defines!': [ 'NDEBUG' ],
        'xcode_settings': {
          'GCC_OPTIMIZATION_LEVEL': '0',
          'GCC_GENERATE_DEBUGGING_SYMBOLS': 'YES',
        }
      },
      'Release': {
        'defines': [ 'NDEBUG' ],
        'defines!': [ 'DEBUG' ],
        'xcode_settings': {
          'GCC_OPTIMIZATION_LEVEL': 's',
          'GCC_GENERATE_DEBUGGING_SYMBOLS': 'NO',
          'DEAD_CODE_STRIPPING': 'YES',
          'GCC_INLINES_ARE_PRIVATE_EXTERN': 'YES'
        },
        'ldflags': [
          '-Wl,-s'
        ],
        'msvs_settings': {
          'VCCLCompilerTool': {
            'DebugInformationFormat': '0',
          },
          'VCLinkerTool': {
            'GenerateDebugInformation': 'false',
          }
        }
      }
    }
  },
  'targets': [
    {
      'target_name': 'jeetah',
      'sources': [
        'src/jeetah.cc'
      ],
      'include_dirs': [
        '<!@(node -p "require(\'node-addon-api\').include")'
      ],
      'defines': [
        'NAPI_VERSION=4',
      ],
      'dependencies': [
        '<!(node -p "require(\'node-addon-api\').gyp")',
        'deps/mir.gyp:mir'
      ],
      'conditions': [
        ['enable_asan == "true"', {
          'cflags_cc': [ '-fsanitize=address' ],
          'ldflags' : [ '-fsanitize=address' ]
        }],
        ["enable_coverage == 'true'", {
          'cflags_cc': [ '-fprofile-arcs', '-ftest-coverage' ],
          'ldflags' : [ '-lgcov', '--coverage' ]
        }]
      ]
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': [ '<(module_name)' ],
      'copies': [
        {
          'files': [
            '<(PRODUCT_DIR)/jeetah.node',
          ],
          'destination': '<(module_path)'
        }
      ]
    }
  ]
}
