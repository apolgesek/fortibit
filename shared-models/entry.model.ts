export interface IEntry {
  id: number;
	groupId: number;
  creationDate: Date;
	lastAccessDate: Date;
	lastModificationDate: Date;
  isStarred: boolean;
	group?: string;
  title?: string;
}