"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcChannel = void 0;
var IpcChannel;
(function (IpcChannel) {
    IpcChannel["OpenFile"] = "openFile";
    IpcChannel["DropFile"] = "fileDrop";
    IpcChannel["OpenUrl"] = "openUrl";
    IpcChannel["TryClose"] = "tryClose";
    IpcChannel["CopyCliboard"] = "copyClipboard";
    IpcChannel["DecryptPassword"] = "decryptPassword";
    IpcChannel["EncryptPassword"] = "encryptPassword";
    IpcChannel["Exit"] = "exit";
    IpcChannel["GetSaveStatus"] = "saveStatus";
    IpcChannel["GetAutotypeFoundEntry"] = "getAutotypeFoundEntry";
    IpcChannel["ProvidePassword"] = "providePassword";
    IpcChannel["SaveFile"] = "saveFile";
    IpcChannel["Minimize"] = "minimize";
    IpcChannel["Maximize"] = "maximize";
    IpcChannel["Close"] = "close";
    IpcChannel["AutocompleteEntry"] = "autocompleteEntry";
    IpcChannel["DecryptDatabase"] = "decryptDatabase";
    IpcChannel["CheckOpenMode"] = "checkOpenMode";
    IpcChannel["GetAppConfig"] = "getAppConfig";
    IpcChannel["DecryptedContent"] = "decryptedContent";
    IpcChannel["OpenCloseConfirmationWindow"] = "openCloseConfirmationWindow";
})(IpcChannel = exports.IpcChannel || (exports.IpcChannel = {}));
//# sourceMappingURL=ipc-channel.enum.js.map