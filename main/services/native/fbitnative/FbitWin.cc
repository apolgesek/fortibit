#define _WIN32_WINNT 0x0601
#define WINVER 0x0601

#define ICON_WIDTH 120
#define ICON_HEIGHT 120

#include <fstream>
#include <iostream>
#include <string>
#include <array>
#include <vector>
#include <iterator>
#include <node.h>
#include <node_buffer.h>
#include <windows.h>
#include <winuser.h>
#include <dwmapi.h>

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

  LASTINPUTINFO SetupLastInputInfo() {
    LASTINPUTINFO info;

    info.cbSize = (uint32_t)sizeof(info);
    info.dwTime = 0;

    return info;
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

  std::vector<char> ReadBMP(const std::string &file)
  {
    static constexpr size_t HEADER_SIZE = 54;

    std::ifstream bmp(file, std::ios::binary);

    std::array<char, HEADER_SIZE> header;
    bmp.read(header.data(), header.size());

    auto fileSize = *reinterpret_cast<uint32_t *>(&header[2]);
    auto dataOffset = *reinterpret_cast<uint32_t *>(&header[10]);
    auto width = *reinterpret_cast<uint32_t *>(&header[18]);
    auto height = *reinterpret_cast<uint32_t *>(&header[22]);
    auto depth = *reinterpret_cast<uint16_t *>(&header[28]);

    std::vector<char> img(dataOffset - HEADER_SIZE);
    bmp.read(img.data(), img.size());

    int dataSize = ((width * 4) & (~4)) * height;
    img.resize(dataSize);
    bmp.read(img.data(), img.size());

    return img;
  }

  HBITMAP CreateDIB(int nWidth, int nHeight, std::string path)
  {
    HBITMAP hbm = NULL;
    HDC hdcMem = CreateCompatibleDC(NULL);
    if (hdcMem != NULL)
    {
      BITMAPINFO bmi;
      ZeroMemory(&bmi.bmiHeader, sizeof(BITMAPINFOHEADER));
      bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
      bmi.bmiHeader.biWidth = nWidth;
      bmi.bmiHeader.biHeight = nHeight;
      bmi.bmiHeader.biPlanes = 1;
      bmi.bmiHeader.biBitCount = 32;

      PBYTE pbDS = NULL;
      hbm = CreateDIBSection(hdcMem, &bmi, DIB_RGB_COLORS, (VOID**)&pbDS, NULL, NULL);

      if (hbm != NULL) 
      {
        std::vector<char> img = ReadBMP(path);
        std::vector<int> backgroundColor = {255, 255, 255};

        int i = 0;
        int startX = (nWidth / 2) - (ICON_WIDTH / 2);
        int startY = (nHeight / 2) - (ICON_HEIGHT / 2);

        for (int y = 0; y < nHeight; y++)
        {
          for (int x = 0; x < nWidth; x++)
          {
            if (x >= startX && x < (startX + ICON_WIDTH) && y >= startY && y < (startY + ICON_HEIGHT))
            {
              pbDS[0] = (BYTE)(int(img[i] & 0xff));
              pbDS[1] = (BYTE)(int(img[i+1] & 0xff));
              pbDS[2] = (BYTE)(int(img[i+2] & 0xff));
              pbDS[3] = (BYTE)(255);

              i += 4;
            }
            else
            {
              pbDS[0] = (BYTE)(backgroundColor[0]);
              pbDS[1] = (BYTE)(backgroundColor[1]);
              pbDS[2] = (BYTE)(backgroundColor[2]);
              pbDS[3] = (BYTE)(255); // alpha
            }

            pbDS += 4;  
          }
        }
      }
    }

    return hbm;
  }

  void SetIconicBitmap(const FunctionCallbackInfo<Value>&args) {
    char* buffer = node::Buffer::Data(args[0]);
    HWND win = static_cast<HWND>(*reinterpret_cast<void **>(buffer));

    BOOL fForceIconic = TRUE;
    BOOL fHasIconicBitmap = TRUE;

    DwmSetWindowAttribute(
      win,
      DWMWA_HAS_ICONIC_BITMAP,
      &fHasIconicBitmap,
      sizeof(fHasIconicBitmap));

    DwmSetWindowAttribute(
      win,
      DWMWA_FORCE_ICONIC_REPRESENTATION,
      &fForceIconic,
      sizeof(fForceIconic));

    DwmInvalidateIconicBitmaps(win);
  }

  void UnsetIconicBitmap(const FunctionCallbackInfo<Value>&args) {
    char* buffer = node::Buffer::Data(args[0]);
    HWND win = static_cast<HWND>(*reinterpret_cast<void **>(buffer));

    BOOL fForceIconic = FALSE;
    BOOL fHasIconicBitmap = FALSE;

    DwmSetWindowAttribute(
      win,
      DWMWA_HAS_ICONIC_BITMAP,
      &fHasIconicBitmap,
      sizeof(fHasIconicBitmap));

    DwmSetWindowAttribute(
      win,
      DWMWA_FORCE_ICONIC_REPRESENTATION,
      &fForceIconic,
      sizeof(fForceIconic));
    
    HRESULT result = E_FAIL;
    result = DwmInvalidateIconicBitmaps(win);

    args.GetReturnValue().Set(result);
  }

  void SetThumbnailBitmap(const FunctionCallbackInfo<Value>&args) {
    Isolate* isolate = args.GetIsolate();

    char* buffer = node::Buffer::Data(args[0]);
    v8::String::Utf8Value str(isolate, args[1]);
    std::string path = *str;

    HWND win = static_cast<HWND>(*reinterpret_cast<void **>(buffer));

    HRESULT result = E_FAIL;
    HBITMAP hbmp = CreateDIB(ICON_WIDTH, ICON_HEIGHT, path);

    if (hbmp) {
      result = DwmSetIconicThumbnail(win, hbmp, 0);
      DeleteObject(hbmp);
    }

    args.GetReturnValue().Set(result);
  }

  void SetLivePreviewBitmap(const FunctionCallbackInfo<Value>&args) {
    Isolate* isolate = args.GetIsolate();

    char* buffer = node::Buffer::Data(args[0]);
    v8::String::Utf8Value str(isolate, args[1]);
    std::string path = *str;

    HWND win = static_cast<HWND>(*reinterpret_cast<void **>(buffer));

    HRESULT result = E_FAIL;

    DWORD dwStyle = GetWindowLong(win, GWL_STYLE);
    DWORD dwStyleEx = GetWindowLong(win, GWL_EXSTYLE);

    RECT rcClient = {};
    RECT rcNCA = {};
    WINDOWPLACEMENT wp;
    if (GetWindowPlacement(win, &wp) != 0)
    {
      if (wp.flags & WPF_RESTORETOMAXIMIZED)
      {
        HMONITOR hmon = MonitorFromRect(&wp.rcNormalPosition, MONITOR_DEFAULTTONULL);
        if (hmon)
        {
          MONITORINFO monitorInfo;
          monitorInfo.cbSize = sizeof(MONITORINFO);
          if (GetMonitorInfo(hmon, &monitorInfo))
          {
            rcClient = monitorInfo.rcWork;
          }
        }
      }
      else
      {
        CopyRect(&rcClient, &wp.rcNormalPosition);
      }

      rcClient.right -= (-rcNCA.left + rcNCA.right);
      rcClient.bottom -= (-rcNCA.top + rcNCA.bottom);
    }

    if ((rcClient.right - rcClient.left) > 0 && (rcClient.bottom - rcClient.top) > 0)
    {
      int winWidth = rcClient.right - rcClient.left;
      int winHeight = rcClient.bottom - rcClient.top;

      HBITMAP hbm = CreateDIB(winWidth, winHeight, path);
      if (hbm)
      {
        result = DwmSetIconicLivePreviewBitmap(win, hbm, NULL, 0);
        DeleteObject(hbm);
      }
    }

    args.GetReturnValue().Set(result);
  }

  void Initialize(Local<Object> exports) {
    NODE_SET_METHOD(exports, "pressPhraseKey", PressPhraseKey);
    NODE_SET_METHOD(exports, "pressKey", PressKey);
    NODE_SET_METHOD(exports, "getActiveWindowTitle", GetActiveWindowTitle);
    NODE_SET_METHOD(exports, "setIconicBitmap", SetIconicBitmap);
    NODE_SET_METHOD(exports, "unsetIconicBitmap", UnsetIconicBitmap);
    NODE_SET_METHOD(exports, "setThumbnailBitmap", SetThumbnailBitmap);
    NODE_SET_METHOD(exports, "setLivePreviewBitmap", SetLivePreviewBitmap);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize);
}