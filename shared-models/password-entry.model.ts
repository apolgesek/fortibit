import { IEntry } from './entry.model';

export interface IPasswordEntry extends IEntry {
	username: string;
	password: string;
	url?: string;
	notes?: string;
	autotypeExp?: string;
	icon?: string;
	history?: IPasswordEntry[];
}
