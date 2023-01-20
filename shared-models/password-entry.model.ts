import { IEntry } from "./entry.model";
import { ExpirationStatus } from "./expiration-status.enum";

export interface IPasswordEntry extends IEntry {
	username: string;
	password: string;
	url?: string;
	notes?: string;
	autotypeExp?: string;
	icon?: string;
	history?: IPasswordEntry[];
	expirationDate?: Date;
	expirationStatus?: ExpirationStatus;
}