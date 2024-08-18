import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { IProcessor } from './processor';
import { Injectable, inject } from '@angular/core';
import { IconService } from '../icon.service';

@Injectable({ providedIn: 'root' })
export class PasswordProcessor implements IProcessor<PasswordEntry> {
  private readonly iconService = inject(IconService);

  beforeAdd() {}

  afterAdd(entry: PasswordEntry) {
    this.iconService.getIconPath(entry, 'url');
  }

  beforeUpdate(entry: PasswordEntry, oldEntry: PasswordEntry, changes: (keyof PasswordEntry)[]): void {
    if (changes?.includes('password')) {
      entry.isExposed = false;
    }
  }

  afterDelete(entry: PasswordEntry) {
    this.iconService.removeIconPath(entry);
  }

  afterUpdate(entry: PasswordEntry, oldEntry: PasswordEntry, changes: (keyof PasswordEntry)[]): void {
    if (
      oldEntry &&
      oldEntry.icon &&
      !oldEntry.icon.startsWith('data:image/png')
    ) {
      this.iconService.replaceIconPath(oldEntry, entry, 'url');
    } else {
      this.iconService.getIconPath(entry, 'url');
    }
  } 
}
