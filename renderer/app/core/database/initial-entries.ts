import { EntryGroup } from '@shared-renderer/entry-group';
import { GroupId } from '../enums';

export const initialEntries: EntryGroup[] = [
	{ name: 'General', id: 1 },
	{ name: 'Banking', id: 2 },
	{ name: 'Email', id: 3 },
	{ name: 'Work', id: 4 },
	{ name: 'All items', id: GroupId.AllItems },
	{ name: 'Favourites', id: GroupId.Starred },
	{ name: 'Recycle bin', id: GroupId.RecycleBin },
];
