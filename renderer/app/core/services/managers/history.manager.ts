import { Injectable, inject } from '@angular/core';
import { DbManager } from '@app/core/database';
import { HistoryRepository } from '@app/core/repositories';
import { IHistoryEntry } from '@shared-renderer/history-entry.model';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HistoryManager {
  public readonly markDirtySource: Subject<void> = new Subject();
  private readonly historyRepository: HistoryRepository = new HistoryRepository(inject(DbManager));

  async get(id: number): Promise<IHistoryEntry[] | undefined> {
    return this.historyRepository.get(id);
  }

  async add(item: IHistoryEntry): Promise<number> {
    this.markDirty();
    return this.historyRepository.add(item);
  }

  async delete(id: number): Promise<void> {
    this.markDirty();
    return this.historyRepository.delete(id);
  }

  async bulkDelete(ids: number[]): Promise<number> {
    this.markDirty();
    return this.historyRepository.bulkDelete(ids);
  }

  async deleteOlderThanDays(value: number): Promise<number> {
    let pastDate = new Date().getTime();
    pastDate -= value * 24 * 60 * 60 * 1000;

    this.markDirty();
    return this.historyRepository.deleteByPredicate(x => x.entry.lastModificationDate < new Date(pastDate));
  }

  async deleteExcessiveRows(): Promise<number> {
    this.markDirty();
    return this.historyRepository.deleteExcessiveRows(20);
  }

  private markDirty() {
    this.markDirtySource.next();
  }
}