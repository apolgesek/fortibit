import { IEntry } from "./entry.model";

export interface IPasswordEntry extends IEntry {
	username: string;
	password: string;
	url?: string;
	notes?: string;
	autotypeExp?: string;
	iconPath?: string;
	history?: IPasswordEntry[];
	expirationDate?: Date;
	expirationStatus?: 'expired' | 'due-expiration';
}