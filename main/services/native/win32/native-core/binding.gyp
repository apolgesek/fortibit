{
  "targets": [
    {
      "target_name": "NativeCore",
      "sources": [ "../native-shared/string_util.cc", "bitmap_util.cc", "certificate.cc", "main.cc" ],
      "libraries": [
        "dwmapi",
        "imagehlp"
      ],
    }
  ],
}