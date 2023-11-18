import { IPasswordEntry } from '../../../../shared/index';
import { DbManager } from '../database/db-manager';
import { GroupId } from '../enums';
import { IEntryRepository, EntryPredicateFn } from './index';

export class EntryRepository implements IEntryRepository {
  constructor(private readonly db: DbManager) {}

  getAll(): Promise<IPasswordEntry[]> {
    return this.db.context.transaction('r', this.db.entries,
      () => this.db.entries.toArray());
  }

  getAllByGroup(groupId: number): Promise<IPasswordEntry[]> {
    return this.db.context.transaction('r', this.db.entries,
      () => this.db.entries.where('groupId').equals(groupId).toArray());
  }

  getAllByPredicate(fn: EntryPredicateFn): Promise<IPasswordEntry[]> {
    return this.db.context.transaction('r', this.db.entries,
      () => this.db.entries.filter(x => fn(x)).toArray());
  }

  get(id: number): Promise<IPasswordEntry | undefined> {
    return this.db.context.transaction('r', this.db.entries, this.db.groups,
      async () => {
        const entry = await this.db.entries.get(id);
        const group = await this.db.groups.get(entry.groupId);
        
        return { ...entry, group: group.name };
      });
  }

  add(item: Partial<IPasswordEntry>): Promise<number> {
    const { group, ...entity } = item;
    return this.db.context.transaction('rw', this.db.entries,
      () => this.db.entries.add(entity as IPasswordEntry));
  }

  bulkAdd(items: IPasswordEntry[]): Promise<number> {
    return this.db.context.transaction('rw', this.db.entries,
      () => this.db.entries.bulkAdd(items));
  }

  update(item: Partial<IPasswordEntry>): Promise<number> {
    const { group, ...entity } = item;
    return this.db.context.transaction('rw', this.db.entries, this.db.groups, async () => {
      if (!item.id) {
        throw new Error('No id provided for the entry to update');
      }

      const originalItem = await this.get(item.id);
      const updatedItem = { ...originalItem, ...entity };

      return this.db.entries.put(updatedItem, item.id);
    });
  }

  delete(id: number): Promise<void> {
    return this.db.context.transaction('rw', this.db.entries,
      () => this.db.entries.delete(id));
  }

  deleteAll(groupId: number): Promise<number> {
    return this.db.context.transaction('rw', this.db.entries,
      () => this.db.entries.where('groupId').equals(groupId).delete());
  }

  bulkDelete(ids: number[]): Promise<void> {
    return this.db.context.transaction('rw', this.db.entries,
      () => this.db.entries.bulkDelete(ids));
  }

  moveEntries(ids: number[], targetGroupId: number): Promise<number[]> {
    return this.db.context.transaction('rw', this.db.entries,
      () => Promise.all(
        ids.map(id => this.db.entries.update(id, { groupId: targetGroupId }))
      ));
  }

  softDelete(ids: number[]): Promise<number[]> {
    return this.db.context.transaction('rw', this.db.entries,
      () => Promise.all(ids.map(
        id => this.db.entries.update(id,
          { groupId: GroupId.RecycleBin, isStarred: false }
        ))
      ));
  }

  getSearchResults(searchPhrase: string): Promise<IPasswordEntry[]> {
    const lowerCasePhrase = searchPhrase.toLowerCase();
    return this.db.context.transaction('r', this.db.entries, () => {
      if (!lowerCasePhrase.length) {
        return [];
      }

      return this.db.entries
        .filter(x => x.title?.toLowerCase().includes(lowerCasePhrase)
          || x.username?.toLowerCase().includes(lowerCasePhrase)
        ).toArray();
    });
  }
}
