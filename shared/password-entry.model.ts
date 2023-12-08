import { Entry } from './entry.model';

export type PasswordEntry = Entry & {
	username: string;
	password: string;
	url?: string;
	notes?: string;
	autotypeExp?: string;
	icon?: string;
	history?: PasswordEntry[];
}
