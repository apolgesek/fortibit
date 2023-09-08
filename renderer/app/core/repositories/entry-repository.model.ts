import { IPasswordEntry } from '../../../../shared/index';
import { IRepository } from './index';

export type EntryPredicateFn = (entry: IPasswordEntry) => boolean;

export interface IEntryRepository extends IRepository<IPasswordEntry> {
  getAllByPredicate(fn: EntryPredicateFn): Promise<IPasswordEntry[]>;
  getAllByGroup(id: number): Promise<IPasswordEntry[]>;
  bulkAdd(items: IPasswordEntry[]): Promise<number>;
  bulkDelete(ids: number[]): Promise<void>;
  moveEntries(ids: number[], targetGroupId: number): Promise<number[]>;
  getSearchResults(searchPhrase: string): Promise<IPasswordEntry[]>;
}
