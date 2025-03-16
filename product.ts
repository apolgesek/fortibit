type EncryptionSettings = {
	passwordLength: number;
	lowercase: boolean;
	uppercase: boolean;
	numbers: boolean;
	specialChars: boolean;
};

export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Frequency = {
	type: 'daily' | 'weekly' | 'monthly';
	oneIn?: number;
	weekDayIndex?: WeekDayIndex;
	dayOfMonth?: number;
};

export type ScheduledReportsSettings = {
	enabled: boolean;
	time?: string;
	frequency?: Frequency;
};

export type Product = {
	name: string;
	temporaryFileExtension: string;
	commit: string;
	webUrl: string;
	webApiUrl: string;
	cdnUrl: string;
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
	clipboardClearSeconds: number;
	biometricsProtectedFiles: string[];
	workspaces: any;
	showInsecureUrlPrompt: boolean;
	protectWindowsFromCapture: boolean;
	autosaveEnabled: boolean;
	scheduledReports: ScheduledReportsSettings;
};
