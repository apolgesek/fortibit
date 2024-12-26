import { Injectable, inject } from '@angular/core';
import { DbManager } from '@app/core/database';
import { HistoryRepository } from '@app/core/repositories';
import { HistoryEntry } from '@shared-renderer/history-entry.model';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HistoryManager {
	public readonly markDirtySource = new Subject<void>();
	private readonly historyRepository: HistoryRepository = new HistoryRepository(
		inject(DbManager),
	);

	async get(id: number): Promise<HistoryEntry[] | undefined> {
		return this.historyRepository.get(id);
	}

	async add(item: HistoryEntry): Promise<number> {
		const result = this.historyRepository.add(item);
		this.markDirty();

		return result;
	}

	async delete(id: number): Promise<void> {
		const result = this.historyRepository.delete(id);
		this.markDirty();

		return result;
	}

	async bulkDelete(ids: number[]): Promise<number> {
		const result = this.historyRepository.bulkDelete(ids);
		this.markDirty();

		return result;
	}

	async deleteOlderThanDays(value: number): Promise<number> {
		let pastDate = new Date().getTime();
		pastDate -= value * 24 * 60 * 60 * 1000;

		const result = this.historyRepository.deleteByPredicate(
			(x) => x.entry.lastModificationDate < new Date(pastDate),
		);

		this.markDirty();

		return result;
	}

	async deleteExcessiveRows(): Promise<number> {
		const result = this.historyRepository.deleteExcessiveRows(20);
		this.markDirty();

		return result;
	}

	private markDirty() {
		this.markDirtySource.next();
	}
}
