#define _WIN32_WINNT 0x0601
#define WINVER 0x0601
#define _UNICODE 1
#define UNICODE 1

#define ICON_WIDTH 120
#define ICON_HEIGHT 120

#include <iostream>
#include <fstream>
#include <string>
#include <array>
#include <vector>
#include <iterator>
#include <node.h>
#include <node_buffer.h>
#include <dwmapi.h>
#include <Softpub.h>
#include <windows.h>
#include <wincrypt.h>
#include <wintrust.h>
#include <imagehlp.h>
#pragma comment(lib, "crypt32.lib")

#include "../native-shared/string_util.h"
#include "bitmap_util.h"
#include "certificate.h"

#define ENCODING (X509_ASN_ENCODING | PKCS_7_ASN_ENCODING)

namespace NativeCore
{
  using v8::ArrayBuffer;
  using v8::Context;
  using v8::FunctionCallbackInfo;
  using v8::Isolate;
  using v8::Local;
  using v8::NewStringType;
  using v8::Number;
  using v8::Object;
  using v8::String;
  using v8::Value;

  INPUT SetupInput()
  {
    INPUT ip;

    ip.type = INPUT_KEYBOARD;
    ip.ki.time = 0;
    ip.ki.dwExtraInfo = 0;
    ip.ki.dwFlags = KEYEVENTF_UNICODE;

    return ip;
  }

  LASTINPUTINFO SetupLastInputInfo()
  {
    LASTINPUTINFO info;

    info.cbSize = (uint32_t)sizeof(info);
    info.dwTime = 0;

    return info;
  }

  void PressPhraseKey(const FunctionCallbackInfo<Value> &args)
  {
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

  void PressKey(const FunctionCallbackInfo<Value> &args)
  {
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

  void GetActiveWindowTitle(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();

    HWND handle = GetForegroundWindow();

    const int windowTextLength = GetWindowTextLengthW(handle) * 4 + 2;
    WCHAR *windowTitle = new WCHAR[windowTextLength];
    GetWindowTextW(handle, windowTitle, windowTextLength);

    Local<String> result = String::NewFromTwoByte(isolate, (const uint16_t *)windowTitle).ToLocalChecked();

    args.GetReturnValue().Set(result);
  }

  void SetIconicBitmap(const FunctionCallbackInfo<Value> &args)
  {
    char *buffer = node::Buffer::Data(args[0]);
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

  void UnsetIconicBitmap(const FunctionCallbackInfo<Value> &args)
  {
    char *buffer = node::Buffer::Data(args[0]);
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

  void SetThumbnailBitmap(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();

    char *buffer = node::Buffer::Data(args[0]);
    v8::String::Utf8Value str(isolate, args[1]);
    std::string path = *str;

    HWND win = static_cast<HWND>(*reinterpret_cast<void **>(buffer));

    HRESULT result = E_FAIL;
    HBITMAP hbmp = CreateDIB(ICON_WIDTH, ICON_HEIGHT, ICON_WIDTH, ICON_HEIGHT, path);

    if (hbmp)
    {
      result = DwmSetIconicThumbnail(win, hbmp, 0);
      DeleteObject(hbmp);
    }

    args.GetReturnValue().Set(result);
  }

  void SetLivePreviewBitmap(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();

    char *buffer = node::Buffer::Data(args[0]);
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

      HBITMAP hbm = CreateDIB(winWidth, winHeight, ICON_WIDTH, ICON_HEIGHT, path);
      if (hbm)
      {
        result = DwmSetIconicLivePreviewBitmap(win, hbm, NULL, 0);
        DeleteObject(hbm);
      }
    }

    args.GetReturnValue().Set(result);
  }

  void VerifySignature(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();
    unsigned int length = args.Length();

    if (length != 1)
      isolate->ThrowError("Expected 1 argument");

    v8::String::Utf8Value str(isolate, args[0]);
    std::string filePath = *str;

    LPCWSTR pwszSourceFile = stringToWString(filePath).c_str();
    LONG lStatus;
    Local<Number> result;

    // Initialize the WINTRUST_FILE_INFO structure.

    WINTRUST_FILE_INFO FileData;
    memset(&FileData, 0, sizeof(FileData));
    FileData.cbStruct = sizeof(WINTRUST_FILE_INFO);
    FileData.pcwszFilePath = pwszSourceFile;
    FileData.hFile = NULL;
    FileData.pgKnownSubject = NULL;

    GUID WVTPolicyGUID = WINTRUST_ACTION_GENERIC_VERIFY_V2;
    WINTRUST_DATA WinTrustData;

    // Initialize the WinVerifyTrust input data structure.

    // Default all fields to 0.
    memset(&WinTrustData, 0, sizeof(WinTrustData));
    WinTrustData.cbStruct = sizeof(WinTrustData);
    // Use default code signing EKU.
    WinTrustData.pPolicyCallbackData = NULL;
    // No data to pass to SIP.
    WinTrustData.pSIPClientData = NULL;
    // Disable WVT UI.
    WinTrustData.dwUIChoice = WTD_UI_NONE;
    // No revocation checking.
    WinTrustData.fdwRevocationChecks = WTD_REVOKE_NONE;
    // Verify an embedded signature on a file.
    WinTrustData.dwUnionChoice = WTD_CHOICE_FILE;
    // Verify action.
    WinTrustData.dwStateAction = WTD_STATEACTION_VERIFY;
    // Verification sets this value.
    WinTrustData.hWVTStateData = NULL;
    // Not used.
    WinTrustData.pwszURLReference = NULL;
    // This is not applicable if there is no UI because it changes
    // the UI to accommodate running applications instead of
    // installing applications.
    WinTrustData.dwUIContext = 0;
    // Set pFile.
    WinTrustData.pFile = &FileData;
    // WinVerifyTrust verifies signatures as specified by the GUID
    // and Wintrust_Data.
    lStatus = WinVerifyTrust(NULL, &WVTPolicyGUID, &WinTrustData);
    result = v8::Number::New(isolate, lStatus);

    // Any hWVTStateData must be released by a call with close.
    WinTrustData.dwStateAction = WTD_STATEACTION_CLOSE;
    lStatus = WinVerifyTrust(NULL, &WVTPolicyGUID, &WinTrustData);

    args.GetReturnValue().Set(result);
  }

  Local<Object> getCertificateInformation(PCCERT_CONTEXT pCertContext, Isolate *isolate)
  {
    Local<Context> context = isolate->GetCurrentContext();
    Local<Object> certificate = Object::New(isolate);

    DWORD dwData;
    LPTSTR szName = NULL;
    if ((dwData = CertGetNameString(pCertContext,
                                    CERT_NAME_SIMPLE_DISPLAY_TYPE,
                                    CERT_NAME_ISSUER_FLAG,
                                    NULL,
                                    NULL,
                                    0)))
    {
      szName = (LPTSTR)LocalAlloc(LPTR, dwData * sizeof(TCHAR));
      if (szName)
      {
        if ((CertGetNameString(pCertContext,
                               CERT_NAME_SIMPLE_DISPLAY_TYPE,
                               CERT_NAME_ISSUER_FLAG,
                               NULL,
                               szName,
                               dwData)))
        {
          certificate->Set(context, String::NewFromUtf8(isolate, "issuer").ToLocalChecked(), String::NewFromUtf8(isolate, wstringToString(szName).c_str()).ToLocalChecked());
        }
      }
      LocalFree(szName);
      szName = NULL;
    }

    if ((dwData = CertGetNameString(pCertContext,
                                    CERT_NAME_SIMPLE_DISPLAY_TYPE,
                                    0,
                                    NULL,
                                    NULL,
                                    0)))
    {
      szName = (LPTSTR)LocalAlloc(LPTR, dwData * sizeof(TCHAR));
      if (szName)
      {
        if ((CertGetNameString(pCertContext,
                               CERT_NAME_SIMPLE_DISPLAY_TYPE,
                               0,
                               NULL,
                               szName,
                               dwData)))
        {
          certificate->Set(context, String::NewFromUtf8(isolate, "subject").ToLocalChecked(), String::NewFromUtf8(isolate, wstringToString(szName).c_str()).ToLocalChecked());
        }
      }
      LocalFree(szName);
      szName = NULL;
    }

    return certificate;
  }

  void CertificateInfo(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    Local<Number> result = v8::Number::New(isolate, 0);

    unsigned int length = args.Length();

    if (length != 1)
      isolate->ThrowError("Expected 1 argument");

    v8::String::Utf8Value str(isolate, args[0]);
    std::string filePath = *str;

    LPCWSTR szFileName = stringToWString(filePath).c_str();

	  WIN_CERTIFICATE certHeader;
	  DWORD dwCertCount = 0;
    WIN_CERTIFICATE *pCert = NULL;
	  char  *pCertBuf = NULL;
    PCCERT_CONTEXT pCertContext = NULL;
    TCHAR *pSubjectName = NULL;

	  HANDLE hFile = INVALID_HANDLE_VALUE;
    hFile = CreateFile(szFileName, FILE_READ_DATA, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL | FILE_FLAG_RANDOM_ACCESS, NULL);
    if (!ImageEnumerateCertificates(hFile, CERT_SECTION_TYPE_ANY, &dwCertCount, NULL, 0))
    {
      std::cout << "ImageEnumerateCertificates error: " << GetLastError() << std::endl;
      result = v8::Number::New(isolate, GetLastError());
      return;
    }

    certHeader.dwLength = 0;
    certHeader.wRevision = WIN_CERT_REVISION_1_0;
    if (!ImageGetCertificateHeader(hFile, 0, &certHeader))
    {
      std::cout << "ImageGetCertificateHeader error: " << GetLastError() << std::endl;
      result = v8::Number::New(isolate, GetLastError());
      return;
    }

    DWORD dwCertLen = certHeader.dwLength;
    pCertBuf = new char[sizeof(WIN_CERTIFICATE) + dwCertLen];
    pCert = (WIN_CERTIFICATE *)pCertBuf;
    pCert->dwLength = dwCertLen;
    pCert->wRevision = WIN_CERT_REVISION_1_0;
    if (!ImageGetCertificateData(hFile, 0, pCert, &dwCertLen))
    {
      std::cout << "ImageGetCertificateData error: " << GetLastError() << std::endl;
      result = v8::Number::New(isolate, GetLastError());
      return;
    }

    DWORD dwDecodeSize = 0;
    CRYPT_VERIFY_MESSAGE_PARA para = { 0 };
    para.cbSize = sizeof(para);
    para.dwMsgAndCertEncodingType = X509_ASN_ENCODING | PKCS_7_ASN_ENCODING;
    if (!CryptVerifyMessageSignature(&para, 0, pCert->bCertificate, pCert->dwLength, NULL, &dwDecodeSize, &pCertContext))
    {
      std::cout << "CryptVerifyMessageSignature error: " << GetLastError() << std::endl;
      result = v8::Number::New(isolate, GetLastError());
      return;
    }

    DWORD dwSubjectSize = CertGetNameStringW(pCertContext, CERT_NAME_SIMPLE_DISPLAY_TYPE, 0, NULL, NULL, 0);
    if (dwSubjectSize <= 0)
    {
      std::cout << "pfnCertGetNameString error: " << GetLastError() << std::endl;
      result = v8::Number::New(isolate, GetLastError());
      return;
    }

    pSubjectName = new TCHAR[dwSubjectSize];
	  CertGetNameStringW(pCertContext, CERT_NAME_SIMPLE_DISPLAY_TYPE, 0, NULL, pSubjectName, dwSubjectSize);

    args.GetReturnValue().Set(String::NewFromTwoByte(isolate, (const uint16_t *)pSubjectName).ToLocalChecked());
  }

  void Initialize(Local<Object> exports)
  {
    NODE_SET_METHOD(exports, "pressPhraseKey", PressPhraseKey);
    NODE_SET_METHOD(exports, "pressKey", PressKey);
    NODE_SET_METHOD(exports, "getActiveWindowTitle", GetActiveWindowTitle);
    NODE_SET_METHOD(exports, "setIconicBitmap", SetIconicBitmap);
    NODE_SET_METHOD(exports, "unsetIconicBitmap", UnsetIconicBitmap);
    NODE_SET_METHOD(exports, "setThumbnailBitmap", SetThumbnailBitmap);
    NODE_SET_METHOD(exports, "setLivePreviewBitmap", SetLivePreviewBitmap);
    NODE_SET_METHOD(exports, "verifySignature", VerifySignature);
    NODE_SET_METHOD(exports, "certificateInfo", CertificateInfo);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize);
}