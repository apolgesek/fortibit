export enum IpcChannel {
  OpenFile = 'openFile',
  DropFile = 'fileDrop',
  OpenUrl = 'openUrl',
  TryClose = 'tryClose',
  CopyCliboard = 'copyClipboard',
  DecryptPassword = 'decryptPassword',
  EncryptPassword = 'encryptPassword',
  Exit = 'exit',
  GetSaveStatus = 'saveStatus',
  GetAutotypeFoundEntry = 'getAutotypeFoundEntry',
  ProvidePassword = 'providePassword',
  SaveFile = 'saveFile',
  Minimize = 'minimize',
  Maximize = 'maximize',
  Lock = 'lock',
  Unlock = 'unlock',
  Close = 'close',
  AutocompleteEntry = 'autocompleteEntry',
  DecryptDatabase = 'decryptDatabase',
  CheckOpenMode = 'checkOpenMode',
  GetAppConfig = 'getAppConfig',
  DecryptedContent = 'decryptedContent',
  OpenCloseConfirmationWindow = 'openCloseConfirmationWindow',
  UpdateAndRelaunch = 'updateAndRelaunch',
  UpdateState = 'updateState',
  ValidatePassword = 'validatePassword',
  ChangePassword = 'changePassword',
  Import = 'import',
  GetImportedDatabaseMetadata = 'getImportedDatabaseMetadata',
}