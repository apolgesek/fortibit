import { Injectable } from '@angular/core';
import { DbContext } from '../database/db-context';
import { IPasswordGroup } from '../models';
import { IGroupRepository } from './index';

@Injectable({providedIn: 'root'})
export class GroupRepository implements IGroupRepository {
  constructor(private db: DbContext) {}

  getAll(): Promise<IPasswordGroup[]> {
    return this.db.transaction('r', this.db.groups, () => {
      return this.db.groups.toArray();
    });
  }

  getAllChildren(parentId: number): Promise<IPasswordGroup[]> {
    return this.db.transaction('r', this.db.groups, () => {
      return this.db.groups.where('parent').equals(parentId).toArray();
    });
  }

  get(id: number): Promise<IPasswordGroup | undefined> {
    return this.db.transaction('r', this.db.groups, () => {
      return this.db.groups.get(id);
    });
  }

  bulkAdd(items: IPasswordGroup[]): Promise<number> {
    return this.db.transaction('rw', this.db.groups, () => {
      return this.db.groups.bulkAdd(items);
    });
  }

  add(item: IPasswordGroup): Promise<number> {
    return this.db.transaction('rw', this.db.groups, () => {
      return this.db.groups.add(item);
    });
  }

  update(item: IPasswordGroup): Promise<number> {
    return this.db.transaction('rw', this.db.groups, () => {
      return this.db.groups.update(item, {...item});
    });
  }

  delete(id: number): Promise<void> {
    return this.db.transaction('rw', this.db.groups, () => {
      return this.db.groups.delete(id);
    });
  }

  bulkDelete(ids: number[]): Promise<void> {
    return this.db.transaction('rw', this.db.groups, this.db.entries, async () => {
      await Promise.all(ids.map(id => this.db.entries.where('groupId').equals(id).delete()));
      return this.db.groups.bulkDelete(ids);
    });
  }
}