import { IPasswordGroup } from '../models';
import { IRepository } from './index';
export interface IGroupRepository extends IRepository<IPasswordGroup> {
  bulkAdd(items: IPasswordGroup[]): Promise<number>;
  bulkDelete(ids: number[]): Promise<void>;
}
