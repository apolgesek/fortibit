import { nativeTheme } from 'electron';
import { platform } from 'os';
import { Configuration } from '../../../configuration';

export const getDefaultConfig = (): Partial<Configuration> => {
	const os = platform();

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
		autosaveEnabled: false,
		autoTypeEnabled: true,
		saveOnLock: false,
		compressionEnabled: false,
		autocompleteUsernameOnlyShortcut: os === 'win32' ? 'Alt+[' : 'Option+[',
		autocompletePasswordOnlyShortcut: os === 'win32' ? 'Alt+]' : 'Option+]',
		autocompleteShortcut: platform() === 'win32' ? 'Alt+\\' : 'Option+\\',
		showInsecureUrlPrompt: true,
		theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
	};
};
