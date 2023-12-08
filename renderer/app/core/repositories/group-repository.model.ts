import { EntryGroup } from '@shared-renderer/entry-group';
import { IRepository } from './index';
export interface IGroupRepository extends IRepository<EntryGroup> {
  bulkAdd(items: EntryGroup[]): Promise<number>;
  bulkDelete(ids: number[]): Promise<void>;
}
