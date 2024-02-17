import { Entry } from '../../../../shared/index';
import { IRepository } from './index';

export type EntryPredicateFn = (entry: Entry) => boolean;

export interface IEntryRepository extends IRepository<Entry> {
	getAllByPredicate(fn: EntryPredicateFn): Promise<Entry[]>;
	getAllByGroup(id: number): Promise<Entry[]>;
	bulkAdd(items: Entry[]): Promise<number>;
	bulkDelete(ids: number[]): Promise<void>;
	moveEntries(ids: number[], targetGroupId: number): Promise<number[]>;
	getSearchResults(searchPhrase: string): Promise<Entry[]>;
}
