"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultConfig = void 0;
var getDefaultConfig = function (platform) {
    return {
        schemaVersion: 1,
        encryption: {
            passwordLength: 15,
            lowercase: true,
            uppercase: true,
            specialChars: true,
            numbers: true,
        },
        idleSeconds: 600,
        clipboardClearTimeMs: 15000,
        lockOnSystemLock: true,
        displayIcons: true,
        biometricsAuthenticationEnabled: false,
        autoTypeEnabled: true,
        saveOnLock: false,
        compressionEnabled: false,
        autocompleteUsernameOnlyShortcut: platform === 'win32' ? 'Alt+[' : 'Option+[',
        autocompletePasswordOnlyShortcut: platform === 'win32' ? 'Alt+]' : 'Option+]',
        autocompleteShortcut: platform === 'win32' ? 'Alt+\\' : 'Option+\\',
        showInsecureUrlPrompt: true
    };
};
exports.getDefaultConfig = getDefaultConfig;
//# sourceMappingURL=default-config.js.map