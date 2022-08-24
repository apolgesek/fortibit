export interface IPasswordEntry {
	id: number;
	groupId: number;
	username: string;
	password: string;
	creationDate: Date;
	lastAccessDate: Date;
	lastModificationDate: Date;
	isStarred: boolean;
	group?: string;
	title?: string;
	url?: string;
	notes?: string;
	autotypeExp?: string;
	iconPath?: string;
	history?: IPasswordEntry[];
}