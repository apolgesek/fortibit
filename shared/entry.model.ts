export interface IEntry {
  id: number;
	groupId: number;
  creationDate: Date;
	lastModificationDate: Date;
  isStarred: boolean;
	group?: string;
  title?: string;
}