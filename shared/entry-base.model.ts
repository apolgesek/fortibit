export type EntryBase = {
	id: number;
	groupId: number;
	creationDate: Date | number;
	lastModificationDate: Date | number;
	isStarred: boolean;
	group?: string;
	title?: string;
};