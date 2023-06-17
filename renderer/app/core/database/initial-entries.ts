import { GroupId } from '../enums';
import { IPasswordGroup } from '../models/index';

export const initialEntries: IPasswordGroup[] = [
  { name: 'General', id: 1, lastModificationDate: new Date() },
  { name: 'Banking', id: 2, lastModificationDate: new Date() },
  { name: 'Email', id: 3, lastModificationDate: new Date() },
  { name: 'Work', id: 4, lastModificationDate: new Date() },
  { name: 'All items', id: GroupId.AllItems, lastModificationDate: new Date() },
  { name: 'Favourites', id: GroupId.Starred, lastModificationDate: new Date() },
  { name: 'Recycle bin', id: GroupId.RecycleBin, lastModificationDate: new Date() },
];
