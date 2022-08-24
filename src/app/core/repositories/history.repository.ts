import { Injectable } from '@angular/core';
import { IHistoryEntry } from '../../../../shared-models';
import { DbContext } from '../database/db-context';
import { IHistoryRepository } from './history-repository.model';

@Injectable({providedIn: 'root'})
export class HistoryRepository implements IHistoryRepository {
  constructor(private readonly db: DbContext) {}

  get(id: number): Promise<IHistoryEntry[] | undefined> {
    return this.db.transaction('r', this.db.history, () => {
      return this.db.history.where('entryId').equals(id).toArray();
    });
  }

  add(item: IHistoryEntry): Promise<number> {
    return this.db.transaction('rw', this.db.history, () => {
      return this.db.history.add(item);
    });
  }

  delete(id: number): Promise<void> {
    return this.db.transaction('rw', this.db.history, () => {
      return this.db.history.delete(id);
    });
  }

  bulkDelete(ids: number[]): Promise<void> {
    return this.db.transaction('rw', this.db.history, async () => {
      await Promise.all(ids.map(id => this.db.history.where('entryId').equals(id).delete()));
    });
  }
}