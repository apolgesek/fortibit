#define _WIN32_WINNT 0x0A000004
#define WINVER 0x0A000004
#define _UNICODE 1
#define UNICODE 1

#include <iostream>
#include <string>
#include <node.h>
#include <node_buffer.h>
#include <shobjidl_core.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Security.Credentials.UI.h>
#include <UserConsentVerifierInterop.h>
#include <windows.h>
#include <wincred.h>
#include <winuser.h>

#include "../native-shared/string_util.h"

using v8::FunctionCallbackInfo;
using v8::Value;
using v8::Isolate;
using v8::Local;
using v8::String;
using v8::Number;

using winrt::Windows::Foundation::IAsyncOperation;
using winrt::Windows::Security::Credentials::UI::UserConsentVerificationResult;
using winrt::Windows::Security::Credentials::UI::UserConsentVerifierAvailability;
using winrt::Windows::Security::Credentials::UI::UserConsentVerifier;
using winrt::com_ptr;

namespace NativeAuth
{
  using v8::FunctionCallbackInfo;
  using v8::Isolate;
  using v8::Local;
  using v8::Object;
  using v8::String;
  using v8::Value;
  using v8::Array;
  using v8::Data;
  using v8::Context;

  IAsyncOperation<UserConsentVerificationResult> RequestVerification(HWND win)
  {
    return winrt::capture<IAsyncOperation<UserConsentVerificationResult>>(
      winrt::get_activation_factory<UserConsentVerifier, IUserConsentVerifierInterop>(),
      &::IUserConsentVerifierInterop::RequestVerificationForWindowAsync,
      win,
      nullptr
    );
  }

  void Verify(const FunctionCallbackInfo<Value> &args)
  {
    char *buffer = node::Buffer::Data(args[0]);
    HWND win = static_cast<HWND>(*reinterpret_cast<void **>(buffer));
    UserConsentVerificationResult verified;

    UserConsentVerifierAvailability result = UserConsentVerifier::CheckAvailabilityAsync().get();
    if (result == UserConsentVerifierAvailability::Available)
    {
      SetForegroundWindow(win);
      SetFocus(win);

      verified = RequestVerification(win).get();
      args.GetReturnValue().Set(verified == UserConsentVerificationResult::Verified);

      return;
    }

    args.GetReturnValue().Set(false);
  }

  void SaveCredential(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();
    v8::String::Utf8Value targetNameArg(isolate, args[0]);
    std::string filePath = *targetNameArg;

    v8::String::Utf8Value passwordArg(isolate, args[1]);
    std::string password = *passwordArg;

    DWORD cbCreds = password.length();

    CREDENTIALW cred = {0};
    cred.Type = CRED_TYPE_GENERIC;
    cred.TargetName = allocateAndCopyWideString(stringToWString(filePath).c_str());
    cred.CredentialBlobSize = cbCreds;
    cred.CredentialBlob = (LPBYTE) password.c_str();
    cred.Persist = CRED_PERSIST_LOCAL_MACHINE;

    BOOL ok = ::CredWriteW (&cred, 0);
    args.GetReturnValue().Set(ok);
  }

  void RemoveCredential(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();
    v8::String::Utf8Value targetNameArg(isolate, args[0]);
    std::string filePath = *targetNameArg;

    BOOL ok = ::CredDeleteW(allocateAndCopyWideString(stringToWString(filePath).c_str()), CRED_TYPE_GENERIC, 0);
    args.GetReturnValue().Set(ok);
  }

  void GetCredential(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();
    v8::String::Utf8Value str(isolate, args[0]);
    std::string filePath = *str;

    PCREDENTIALW pcred;
    BOOL ok = ::CredReadW(stringToWString(filePath).c_str(), CRED_TYPE_GENERIC, 0, &pcred);

    Local<String> result = String::NewFromUtf8(isolate, (const char *)pcred->CredentialBlob).ToLocalChecked();
    args.GetReturnValue().Set(result);
    ::CredFree(pcred);
  }

  void ListCredentials(const FunctionCallbackInfo<Value> &args)
  {
    Isolate *isolate = args.GetIsolate();
    v8::String::Utf8Value v8Prefix(isolate, args[0]);
    std::string prefix = *v8Prefix;

	  CREDENTIALW **pCredArray;
		DWORD dwCount;

    BOOL ok = ::CredEnumerateW(stringToWString(prefix + "*").c_str(), 0, &dwCount, &pCredArray);

    Local<Context> ctx = isolate->GetCurrentContext();
    Local<Array> creds = Array::New(isolate, dwCount);
    for (unsigned int i = 0; i < dwCount; i++)		{
			PCREDENTIAL pCredential = pCredArray[i];
      Local<Value> cred = String::NewFromTwoByte(isolate, (const uint16_t *)pCredential->TargetName).ToLocalChecked();
      creds->Set(ctx, i, cred);
    }

    args.GetReturnValue().Set(creds);
    ::CredFree(pCredArray);
  }

  void Initialize(Local<Object> exports)
  {
    NODE_SET_METHOD(exports, "verify", Verify);
    NODE_SET_METHOD(exports, "saveCredential", SaveCredential);
    NODE_SET_METHOD(exports, "getCredential", GetCredential);
    NODE_SET_METHOD(exports, "removeCredential", RemoveCredential);
    NODE_SET_METHOD(exports, "listCredentials", ListCredentials);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize);
}