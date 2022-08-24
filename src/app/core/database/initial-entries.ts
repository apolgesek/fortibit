import { GroupIds } from '../enums';
import { IPasswordGroup } from '../models/index';

export const initialEntries: IPasswordGroup[] = [
  { name: 'Database', id: 1, expanded: true },
  { name: 'General', id: 2, parent: 1 },
  { name: 'Email', id: 3, parent: 1 },
  { name: 'Work', id: 4, parent: 1 },
  { name: 'Banking', id: 5, parent: 1 },
  { name: 'Starred entries', id: GroupIds.Starred, parent: null },
  { name: 'Recycle bin', id: GroupIds.RecycleBin, parent: null }
];