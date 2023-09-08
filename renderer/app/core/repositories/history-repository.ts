import { Injectable } from '@angular/core';
import { IHistoryEntry } from '../../../../shared';
import { DbManager } from '../database/db-manager';
import { HistoryEntryPredicateFn, IHistoryRepository } from './history-repository.model';

@Injectable({providedIn: 'root'})
export class HistoryRepository implements IHistoryRepository {
  constructor(private readonly db: DbManager) {}

  get(id: number): Promise<IHistoryEntry[] | undefined> {
    return this.db.context.transaction('r', this.db.history,
      () => this.db.history.where('entryId').equals(id).toArray());
  }

  add(item: IHistoryEntry): Promise<number> {
    return this.db.context.transaction('rw', this.db.history, async () => {
      return this.db.history.add(item);
    });
  }

  delete(id: number): Promise<void> {
    return this.db.context.transaction('rw', this.db.history,
      () => this.db.history.delete(id));
  }

  deleteByPredicate(fn: HistoryEntryPredicateFn): Promise<number> {
    return this.db.context.transaction('rw', this.db.history, async () => {
      const historyEntries = await this.db.history.filter(x => fn(x, this.db.history)).toArray();
      const ids = historyEntries.map((x: IHistoryEntry) => x.id);

      return this.bulkDelete(ids);
    });
  }

  bulkDelete(ids: number[]): Promise<number> {
    return this.db.context.transaction('rw', this.db.history, async () => {
      const result = await Promise.all(ids.map(id => this.db.history.where('id').equals(id).delete()));
      return result.length;
    });
  }

  deleteExcessiveRows(entryId: number): Promise<number> {
    return this.db.context.transaction('rw', this.db.entries, this.db.history, async () => {
      const keys = (await this.db.history.where('entryId').equals(entryId).offset(20).toArray()).map(x => x.id);
      return this.bulkDelete(keys);
    });
  }
}
