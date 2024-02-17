/* eslint-disable @typescript-eslint/no-empty-interface */
import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import {
	EntryGroup,
	HistoryEntry,
	Entry,
	Report,
} from '../../../../shared/index';

export type IDbContext = Dexie;
export type IDbTable<T, K> = Dexie.Table<T, K>;

@Injectable({ providedIn: 'root' })
export class DbManager {
	entries: IDbTable<Entry, number>;
	groups: IDbTable<EntryGroup, number>;
	reports: IDbTable<Report, number>;
	history: IDbTable<HistoryEntry, number>;

	readonly schemas = {
		entries: '++id,groupId,title,username,cardholderName',
		groups: '++id',
		reports: '++id,type,creationDate',
		history: '++id,entryId,entry.lastModificationDate',
	};

	// name must be unique to ensure stable access with multiple vaults open at the same time
	private readonly name: string = 'main' + new Date().getTime();
	private instance: IDbContext;

	public get context(): IDbContext {
		return this.instance;
	}

	public create() {
		if (this.instance) {
			throw new Error('Database already exists');
		}

		this.instance = new Dexie(this.name, { autoOpen: true });
		this.instance.version(1).stores(this.schemas);

		this.entries = this.instance.table('entries');
		this.groups = this.instance.table('groups');
		this.reports = this.instance.table('reports');
		this.history = this.instance.table('history');
	}

	public async delete(): Promise<void> {
		await Dexie.delete(this.name);
		this.instance = null;

		return;
	}

	public async reset(): Promise<void> {
		if (this.instance) {
			this.instance.close();
			
			await this.instance.delete();
			await this.instance.open();
		} else {
			Promise.resolve();
		}
	}
}
