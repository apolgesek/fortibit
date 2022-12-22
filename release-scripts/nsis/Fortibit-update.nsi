Unicode True

!define APP_NAME "Fortibit"
!define COMP_NAME "Arkadiusz Polgesek"
!define VERSION "01.01.00.00"
!define COPYRIGHT "Arkadiusz Polgesek © 2020"
!define DESCRIPTION "Application"
!define LICENSE_TXT "..\..\LICENSE"
!define INSTALLER_NAME "fortibit_win32_x64_update.exe"
!define MAIN_APP_EXE "fortibit.exe"
!define INSTALL_TYPE "SetShellVarContext current"
!define REG_ROOT "HKCU"
!define REG_APP_PATH "Software\Microsoft\Windows\CurrentVersion\App Paths\${MAIN_APP_EXE}"
!define UNINSTALL_PATH "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

!define REG_START_MENU "Start Menu Folder"

######################################################################

VIProductVersion  "${VERSION}"
VIAddVersionKey "ProductName"  "${APP_NAME}"
VIAddVersionKey "CompanyName"  "${COMP_NAME}"
VIAddVersionKey "LegalCopyright"  "${COPYRIGHT}"
VIAddVersionKey "FileDescription"  "${DESCRIPTION}"
VIAddVersionKey "FileVersion"  "${VERSION}"

######################################################################
!include "MUI2.nsh"
!include "FileAssociation.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

SetCompressor LZMA
Name "${APP_NAME}"
Caption "${APP_NAME}"
OutFile "..\..\release\${INSTALLER_NAME}"
BrandingText "${APP_NAME}"
InstallDirRegKey "${REG_ROOT}" "${REG_APP_PATH}" ""
InstallDir "$LOCALAPPDATA\Programs\Fortibit"
RequestExecutionLevel user

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ReadRegStr $0 "${REG_ROOT}" "${REG_APP_PATH}" "InstallDir"
  ${If} ${Errors}
    Abort
  ${EndIf}
FunctionEnd

Section Main
  SetAutoClose true
  SetOverwrite ifdiff
  SetOutPath "$INSTDIR"

  DetailPrint "Please wait while updating..."
  SetDetailsPrint none

  File /r "..\..\release\win-unpacked\"

  SetDetailsPrint textonly
SectionEnd

Function .onInstSuccess
  ${GetParameters} $R0
  ${GetOptions} $R0 "/R" $R1
  IfErrors +2 0
  ReadRegStr $R2 "${REG_ROOT}" "${REG_APP_PATH}" "InstallDir"
  Exec "$R2\${MAIN_APP_EXE}"
FunctionEnd