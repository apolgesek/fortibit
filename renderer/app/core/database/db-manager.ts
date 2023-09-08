/* eslint-disable @typescript-eslint/no-empty-interface */
import { Injectable } from '@angular/core';
import { IHistoryEntry, IPasswordEntry, IReport } from '../../../../shared/index';
import Dexie from 'dexie';
import { IPasswordGroup } from '../models';

export interface IDbContext extends Dexie {}
export interface IDbTable<T, K> extends Dexie.Table<T, K> {}

@Injectable({ providedIn: 'root' })
export class DbManager {
  entries: IDbTable<IPasswordEntry, number>;
  groups: IDbTable<IPasswordGroup, number>;
  reports: IDbTable<IReport, number>;
  history: IDbTable<IHistoryEntry, number>;

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
    this.instance.version(1).stores({
      entries: '++id,groupId,title,username',
      groups: '++id',
      reports: '++id,type,creationDate',
      history: '++id,entryId,entry.lastModificationDate'
    });

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
      await this.instance.delete();
      await this.instance.open();
    } else {
      Promise.resolve();
    }
  }
}
