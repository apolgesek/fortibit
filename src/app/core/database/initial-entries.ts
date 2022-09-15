import { GroupId } from '../enums';
import { IPasswordGroup } from '../models/index';

export const initialEntries: IPasswordGroup[] = [
  { name: 'General', id: 1, parent: null },
  { name: 'Banking', id: 2, parent: null },
  { name: 'Email', id: 3, parent: null },
  { name: 'Work', id: 4, parent: null },
  { name: 'All items', id: GroupId.AllItems, parent: null },
  { name: 'Favourites', id: GroupId.Starred, parent: null },
  { name: 'Recycle bin', id: GroupId.RecycleBin, parent: null },
];