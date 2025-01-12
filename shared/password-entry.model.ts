import { EntryBase } from './entry-base.model';

export type PasswordEntry = EntryBase & {
	type: 'password';
	username: string;
	password: string;
	url?: string;
	notes?: string;
	autotypeExp?: string;
	icon?: string | null;
	history?: PasswordEntry[];
	isExposed?: boolean;
	isSecureProtocolAvailable?: boolean;
	isTfaAvailable?: boolean;
	otpAuth?: string;
};
