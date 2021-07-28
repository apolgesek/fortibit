#define WINVER 0x0500
#include <node.h>
#include <windows.h>
#include <winuser.h>

namespace FbitNative {
  using v8::FunctionCallbackInfo;
  using v8::Isolate;
  using v8::Local;
  using v8::Object;
  using v8::Number;
  using v8::String;
  using v8::Value;
  using v8::NewStringType;
  
  INPUT SetupInput() {
    INPUT ip;

    ip.type = INPUT_KEYBOARD;
    ip.ki.time = 0;
    ip.ki.dwExtraInfo = 0;
    ip.ki.dwFlags = KEYEVENTF_UNICODE;

    return ip;
  }

  void PressPhraseKey(const FunctionCallbackInfo<Value>&args) {
    int charCode = args[0].As<Number>()->Value();

    INPUT ip = SetupInput();
    ip.ki.wScan = charCode;
    ip.ki.wVk = 0;

    SendInput(1, &ip, sizeof(INPUT));

    Sleep(30);

    ip.ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &ip, sizeof(INPUT));

    args.GetReturnValue().Set(true);
  }

  void PressKey(const FunctionCallbackInfo<Value>&args) {
    int charCode = args[0].As<Number>()->Value();

    INPUT ip = SetupInput();
    ip.ki.wVk = charCode;
    ip.ki.wScan = 0;

    SendInput(1, &ip, sizeof(INPUT));

    Sleep(30);

    ip.ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &ip, sizeof(INPUT));

    args.GetReturnValue().Set(true);
  }

  void GetActiveWindowTitle(const FunctionCallbackInfo<Value>&args) {
    Isolate* isolate = args.GetIsolate(); 

    HWND handle = GetForegroundWindow();

    const int windowTextLength = GetWindowTextLengthW(handle) * 4 + 2;
    WCHAR* windowTitle = new WCHAR[windowTextLength];
    GetWindowTextW(handle, windowTitle, windowTextLength);

    Local<String> result = String::NewFromTwoByte(isolate, (const uint16_t *)windowTitle).ToLocalChecked();

    args.GetReturnValue().Set(result);
  }

  void Initialize(Local<Object> exports) {
    NODE_SET_METHOD(exports, "pressPhraseKey", PressPhraseKey);
    NODE_SET_METHOD(exports, "pressKey", PressKey);
    NODE_SET_METHOD(exports, "getActiveWindowTitle", GetActiveWindowTitle);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize);
}