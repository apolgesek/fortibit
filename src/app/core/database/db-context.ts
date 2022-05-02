import Dexie from 'dexie';

import { Injectable } from '@angular/core';
import { IPasswordGroup } from '../models';
import { IPasswordEntry } from '@shared-renderer/index';

@Injectable({providedIn: 'root'})
export class DbContext extends Dexie {
  entries: Dexie.Table<IPasswordEntry, number>;
  groups: Dexie.Table<IPasswordGroup, number>;

  constructor() {
    Dexie.delete('db');
    super('db');

    this.version(1).stores({
      entries: '++id,groupId,title,username',
      groups: '++id,parent'
    });

    this.entries = this.table('entries');
    this.groups = this.table('groups');
  }

  async resetDb() {
    await this.groups.clear();
    await this.entries.clear();
  }
}