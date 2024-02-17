type EncryptionSettings = {
	passwordLength: number;
	lowercase: boolean;
	uppercase: boolean;
	numbers: boolean;
	specialChars: boolean;
};

export type Product = {
	name: string;
	temporaryFileExtension: string;
	commit: string;
	webUrl: string;
	iconServiceUrl: string;
	updateUrl: string;
	signatureSubject: string;
	leakedPasswordsUrl: string;
	compressionEnabled: boolean;
	encryption: EncryptionSettings;
	idleSeconds: number;
	lockOnSystemLock: boolean;
	saveOnLock: boolean;
	displayIcons: boolean;
	autoTypeEnabled: boolean;
	autocompleteShortcut: string;
	autocompleteUsernameOnlyShortcut: string;
	autocompletePasswordOnlyShortcut: string;
	biometricsAuthenticationEnabled: boolean;
	theme: 'dark' | 'light';
	clipboardClearTimeMs: number;
	biometricsProtectedFiles: string[];
	workspaces: any;
	showInsecureUrlPrompt: boolean;
	protectWindowsFromCapture: boolean;
};
