import { Injectable } from '@angular/core';
import { IPasswordEntry } from '@shared-renderer/index';
import { DbContext } from '../database/db-context';
import { IEntryRepository } from './index';

@Injectable({providedIn: 'root'})
export class EntryRepository implements IEntryRepository {
  constructor(private readonly db: DbContext) {}

  getAll(): Promise<IPasswordEntry[]> {
    return this.db.transaction('r', this.db.entries, () => {
      return this.db.entries.toArray();
    });
  }

  getAllByGroup(groupId: number): Promise<IPasswordEntry[]> {
    return this.db.transaction('r', this.db.entries, () => {
      return this.db.entries.where('groupId').equals(groupId).toArray();
    });
  }

  get(id: number): Promise<IPasswordEntry | undefined> {
    return this.db.transaction('r', this.db.entries, () => {
      return this.db.entries.get(id);
    });
  }

  add(item: IPasswordEntry): Promise<number> {
    return this.db.transaction('rw', this.db.entries, () => {
      return this.db.entries.add(item);
    });
  }

  bulkAdd(items: IPasswordEntry[]): Promise<number> {
    return this.db.transaction('rw', this.db.entries, () => {
      return this.db.entries.bulkAdd(items);
    });
  }

  update(item: IPasswordEntry): Promise<number> {
    return this.db.transaction('rw', this.db.entries, () => {
      if (!item.id) {
        throw new Error('No id provided for the entry to update');
      }
  
      return this.db.entries.update(item.id, {...item});
    });
  }

  delete(id: number): Promise<void> {
    return this.db.transaction('rw', this.db.entries, () => {
      return this.db.entries.delete(id);
    });
  }

  deleteAll(groupId: number): Promise<number> {
    return this.db.transaction('rw', this.db.entries, () => {
      return this.db.entries.where('groupId').equals(groupId).delete();
    });
  }

  bulkDelete(ids: number[]): Promise<void> {
    return this.db.transaction('rw', this.db.entries, () => {
      return this.db.entries.bulkDelete(ids);
    });
  }

  moveEntries(ids: number[], targetGroupId: number): Promise<number[]> {
    return this.db.transaction('rw', this.db.entries, () => {
      return Promise.all(ids.map(id => this.db.entries.update(id, { groupId: targetGroupId })));
    });
  }

  getSearchResults(searchPhrase: string): Promise<IPasswordEntry[]> {
    const lowerCasePhrase = searchPhrase.toLowerCase();
    return this.db.transaction('r', this.db.entries, () => {
      if (!lowerCasePhrase.length) {
        return [];
      }

      return this.db.entries
        .filter(x => x.title?.toLowerCase().includes(lowerCasePhrase)
          || x.username.toLowerCase().includes(lowerCasePhrase)
        ).toArray();
    });
  }
}