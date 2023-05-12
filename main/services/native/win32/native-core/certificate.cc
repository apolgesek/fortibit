#define _UNICODE 1
#define UNICODE 1

#include <stdio.h>
#include <stdlib.h>
#include <windows.h>
#include <wincrypt.h>
#include <wintrust.h>
#pragma comment(lib, "wintrust")
#pragma comment(lib, "crypt32.lib")

#include "../native-shared/string_util.h"
#include "certificate.h"

#define ENCODING (X509_ASN_ENCODING | PKCS_7_ASN_ENCODING)

BOOL getProgAndPublisherInfo(PCMSG_SIGNER_INFO pSignerInfo, PSPROG_PUBLISHERINFO Info)
{

  BOOL fReturn = FALSE;
  PSPC_SP_OPUS_INFO OpusInfo = NULL;
  DWORD dwData;
  BOOL fResult;

  for (DWORD n = 0; n < pSignerInfo->AuthAttrs.cAttr; n++)
  {
    if (lstrcmpA(SPC_SP_OPUS_INFO_OBJID,
                 pSignerInfo->AuthAttrs.rgAttr[n].pszObjId) == 0)
    {
      fResult = CryptDecodeObject(ENCODING,
                                  SPC_SP_OPUS_INFO_OBJID,
                                  pSignerInfo->AuthAttrs.rgAttr[n].rgValue[0].pbData,
                                  pSignerInfo->AuthAttrs.rgAttr[n].rgValue[0].cbData,
                                  0,
                                  NULL,
                                  &dwData);
      if (fResult)
      {
        OpusInfo = (PSPC_SP_OPUS_INFO)LocalAlloc(LPTR, dwData);
        if (OpusInfo)
        {
          fResult = CryptDecodeObject(ENCODING,
                                      SPC_SP_OPUS_INFO_OBJID,
                                      pSignerInfo->AuthAttrs.rgAttr[n].rgValue[0].pbData,
                                      pSignerInfo->AuthAttrs.rgAttr[n].rgValue[0].cbData,
                                      0,
                                      OpusInfo,
                                      &dwData);
          if (fResult)
          {
            if (OpusInfo->pwszProgramName)
            {
              Info->lpszProgramName =
                  allocateAndCopyWideString(OpusInfo->pwszProgramName);
            }
            else
              Info->lpszProgramName = NULL;

            if (OpusInfo->pPublisherInfo)
            {
              switch (OpusInfo->pPublisherInfo->dwLinkChoice)
              {
              case SPC_URL_LINK_CHOICE:
                Info->lpszPublisherLink =
                    allocateAndCopyWideString(OpusInfo->pPublisherInfo->pwszUrl);
                break;

              case SPC_FILE_LINK_CHOICE:
                Info->lpszPublisherLink =
                    allocateAndCopyWideString(OpusInfo->pPublisherInfo->pwszFile);
                break;

              default:
                Info->lpszPublisherLink = NULL;
                break;
              }
            }
            else
            {
              Info->lpszPublisherLink = NULL;
            }

            if (OpusInfo->pMoreInfo)
            {
              switch (OpusInfo->pMoreInfo->dwLinkChoice)
              {
              case SPC_URL_LINK_CHOICE:
                Info->lpszMoreInfoLink =
                    allocateAndCopyWideString(OpusInfo->pMoreInfo->pwszUrl);
                break;

              case SPC_FILE_LINK_CHOICE:
                Info->lpszMoreInfoLink =
                    allocateAndCopyWideString(OpusInfo->pMoreInfo->pwszFile);
                break;

              default:
                Info->lpszMoreInfoLink = NULL;
                break;
              }
            }
            else
            {
              Info->lpszMoreInfoLink = NULL;
            }

            fReturn = TRUE;
          }
        }
      }
      break;
    }
  }

  if (OpusInfo != NULL)
    LocalFree(OpusInfo);

  return fReturn;
}

BOOL getTimeStampSignerInfo(PCMSG_SIGNER_INFO pSignerInfo, PCMSG_SIGNER_INFO *pCounterSignerInfo)
{
  PCCERT_CONTEXT pCertContext = NULL;
  BOOL fReturn = FALSE;
  BOOL fResult;
  DWORD dwSize;

  *pCounterSignerInfo = NULL;

  for (DWORD n = 0; n < pSignerInfo->UnauthAttrs.cAttr; n++)
  {
    if (lstrcmpA(pSignerInfo->UnauthAttrs.rgAttr[n].pszObjId, szOID_RSA_counterSign) == 0)
    {
      fResult = CryptDecodeObject(ENCODING,
                                  PKCS7_SIGNER_INFO,
                                  pSignerInfo->UnauthAttrs.rgAttr[n].rgValue[0].pbData,
                                  pSignerInfo->UnauthAttrs.rgAttr[n].rgValue[0].cbData,
                                  0,
                                  NULL,
                                  &dwSize);
      if (fResult)
      {
        *pCounterSignerInfo = (PCMSG_SIGNER_INFO)LocalAlloc(LPTR, dwSize);
        if (*pCounterSignerInfo)
        {
          fResult = CryptDecodeObject(ENCODING,
                                      PKCS7_SIGNER_INFO,
                                      pSignerInfo->UnauthAttrs.rgAttr[n].rgValue[0].pbData,
                                      pSignerInfo->UnauthAttrs.rgAttr[n].rgValue[0].cbData,
                                      0,
                                      (PVOID)*pCounterSignerInfo,
                                      &dwSize);
          if (fResult)
          {
            fReturn = TRUE;
          }
        }
      }
      break;
    }
  }

  if (pCertContext != NULL)
    CertFreeCertificateContext(pCertContext);

  return fReturn;
}