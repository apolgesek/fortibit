import { IEntryGroup } from '@shared-renderer/entry-group';
import { IRepository } from './index';
export interface IGroupRepository extends IRepository<IEntryGroup> {
  bulkAdd(items: IEntryGroup[]): Promise<number>;
  bulkDelete(ids: number[]): Promise<void>;
}
