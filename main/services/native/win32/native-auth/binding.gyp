{
  "targets": [
    {
      "target_name": "NativeAuth",
      "sources": [ "../native-shared/string_util.cc", "main.cc" ],
      'msvs_settings': {
        'VCCLCompilerTool': {
          'ExceptionHandling': '2',  # /EHsc
        },
      }
    }
  ],
}