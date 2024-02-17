import { Entry } from '@shared-renderer/entry.model';

export interface IEntryTypeMapper<EntryForm, T extends Entry> {
	map(form: EntryForm): Promise<Partial<T>>;
}
