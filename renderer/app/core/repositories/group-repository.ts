import { IEntryGroup } from '@shared-renderer/entry-group';
import { DbManager } from '../database/db-manager';
import { GroupId } from '../enums';
import { IGroupRepository } from './index';

export class GroupRepository implements IGroupRepository {
  constructor(private readonly db: DbManager) {}

  getAll(): Promise<IEntryGroup[]> {
    return this.db.context.transaction('r', this.db.groups,
      () => this.db.groups.toArray());
  }

  get(id: number): Promise<IEntryGroup | undefined> {
    return this.db.context.transaction('r', this.db.groups,
      () => this.db.groups.get(id));
  }

  bulkAdd(items: IEntryGroup[]): Promise<number> {
    return this.db.context.transaction('rw', this.db.groups,
      () => this.db.groups.bulkAdd(items));
  }

  add(item: IEntryGroup): Promise<number> {
    return this.db.context.transaction('rw', this.db.groups,
      () => this.db.groups.add(item));
  }

  update(item: IEntryGroup): Promise<number> {
    return this.db.context.transaction('rw', this.db.groups,
      () => this.db.groups.update(item, {...item}));
  }

  delete(id: number): Promise<void> {
    return this.db.context.transaction('rw', this.db.groups,
      () => this.db.groups.delete(id));
  }

  bulkDelete(ids: number[]): Promise<void> {
    return this.db.context.transaction('rw', this.db.groups, this.db.entries,
      async () => {
        await Promise.all(ids.map(
          id => this.db.entries.where('groupId').equals(id).modify(
            { groupId: GroupId.RecycleBin, isStarred: false }
          )
        ));

        return this.db.groups.bulkDelete(ids);
      });
  }
}
