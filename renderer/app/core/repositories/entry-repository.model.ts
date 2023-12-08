import { PasswordEntry } from '../../../../shared/index';
import { IRepository } from './index';

export type EntryPredicateFn = (entry: PasswordEntry) => boolean;

export interface IEntryRepository extends IRepository<PasswordEntry> {
  getAllByPredicate(fn: EntryPredicateFn): Promise<PasswordEntry[]>;
  getAllByGroup(id: number): Promise<PasswordEntry[]>;
  bulkAdd(items: PasswordEntry[]): Promise<number>;
  bulkDelete(ids: number[]): Promise<void>;
  moveEntries(ids: number[], targetGroupId: number): Promise<number[]>;
  getSearchResults(searchPhrase: string): Promise<PasswordEntry[]>;
}
