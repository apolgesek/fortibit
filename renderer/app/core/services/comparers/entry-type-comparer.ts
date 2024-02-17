import { Entry } from '@shared-renderer/entry.model';

export interface IEntryTypeComparer<
	EntryType extends Entry,
	FormType,
	PayloadType,
> {
	compare(entry: EntryType, form: FormType, payload: PayloadType): boolean;
}
