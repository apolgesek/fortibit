import { GroupId } from '../enums';
import { IPasswordGroup } from '../models/index';

export const initialEntries: IPasswordGroup[] = [
  { name: 'General', id: 1 },
  { name: 'Banking', id: 2 },
  { name: 'Email', id: 3 },
  { name: 'Work', id: 4 },
  { name: 'All items', id: GroupId.AllItems },
  { name: 'Favourites', id: GroupId.Starred },
  { name: 'Recycle bin', id: GroupId.RecycleBin },
];
