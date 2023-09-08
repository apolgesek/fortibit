import { IProduct } from "../product";

export const getDefaultConfig = (platform: string) => {
  return {
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
  } as Partial<IProduct>
}