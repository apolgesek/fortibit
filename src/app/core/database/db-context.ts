import Dexie from 'dexie';

import { Injectable } from '@angular/core';
import { IPasswordGroup } from '../models';
import { IHistoryEntry, IPasswordEntry, IReport } from '@shared-renderer/index';

@Injectable({providedIn: 'root'})
export class DbContext extends Dexie {
  entries: Dexie.Table<IPasswordEntry, number>;
  groups: Dexie.Table<IPasswordGroup, number>;
  reports: Dexie.Table<IReport, number>;
  history: Dexie.Table<IHistoryEntry, number>;

  constructor() {
    Dexie.delete('db');
    super('db');

    this.version(1).stores({
      entries: '++id,groupId,title,username',
      groups: '++id,parent',
      reports: '++id,type,creationDate',
      history: '++id,entryId'
    });

    this.entries = this.table('entries');
    this.groups = this.table('groups');
    this.reports = this.table('reports');
    this.history = this.table('history');
  }

  async resetDb(): Promise<void> {
    await Promise.all([
      this.groups.clear(),
      this.entries.clear(),
      this.reports.clear(),
      this.history.clear()
    ]);
  }
}