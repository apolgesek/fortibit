export interface IPasswordEntry {
	id: number;
	groupId: number;
	username: string;
	password: string;
	creationDate: Date;
	lastAccessDate: Date;
	lastModificationDate: Date;
	title?: string;
	url?: string;
	notes?: string;
}