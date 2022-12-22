import { IPasswordEntry } from '@shared-renderer/index';
import { IRepository } from './index';

export type PredicateFn = (entry: IPasswordEntry) => boolean;

export interface IEntryRepository extends IRepository<IPasswordEntry> {
  getAllByPredicate(fn: PredicateFn): Promise<IPasswordEntry[]>;
  getAllByGroup(id: number): Promise<IPasswordEntry[]>;
  bulkAdd(items: IPasswordEntry[]): Promise<number>;
  bulkDelete(ids: number[]): Promise<void>;
  moveEntries(ids: number[], targetGroupId: number): Promise<number[]>;
  getSearchResults(searchPhrase: string): Promise<IPasswordEntry[]>;
}