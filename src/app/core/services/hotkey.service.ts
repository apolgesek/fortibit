import { Injectable } from '@angular/core';
import { PasswordStoreService } from './password-store.service';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  private hotkeyProvider: IHotkeyProvider;

  constructor(private passwordStore: PasswordStoreService) {
    if (process.platform === 'darwin') {
      this.hotkeyProvider = new DarwinHotkeyProvider(this.passwordStore);
    } else {
      this.hotkeyProvider = new WindowsHotkeyProvider(this.passwordStore);
    }
  }

  intercept(event: KeyboardEvent) {
    this.hotkeyProvider.registerSaveDatabase(event);
    this.hotkeyProvider.registerDeleteEntry(event);
    this.hotkeyProvider.registerEditEntry(event);
    this.hotkeyProvider.registerAddEntry(event);
  }

}

interface IHotkeyProvider {
  registerSaveDatabase: (event: any) => void;
  registerDeleteEntry: (event: any) => void;
  registerEditEntry: (event: any) => void;
  registerAddEntry: (event: any) => void;
  //select allentries - ctrl/meta + a
}

class DarwinHotkeyProvider implements IHotkeyProvider {
  constructor(private passwordStore: PasswordStoreService) {}

  public registerSaveDatabase(event: KeyboardEvent) {
      if (event.key === 's' && event.metaKey) {
        this.passwordStore.trySaveDatabase();
      }
  }

  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.key === 'Backspace' && event.metaKey) {
      this.passwordStore.openDeleteEntryWindow();
    }
  }

  public registerEditEntry(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.passwordStore.openEditEntryWindow();
    }
  }

  public registerAddEntry(event: KeyboardEvent) {
    if (event.key === 'i' && event.metaKey) {
      this.passwordStore.openAddEntryWindow();
    }
  }
}

class WindowsHotkeyProvider implements IHotkeyProvider {
  constructor(private passwordStore: PasswordStoreService) {}

  public registerSaveDatabase(event: KeyboardEvent) {
      if (event.key === 's' && event.ctrlKey) {
        this.passwordStore.trySaveDatabase();
      }
  }

  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.key === 'Del') {
      this.passwordStore.openDeleteEntryWindow();
    }
  }

  public registerEditEntry(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.passwordStore.openEditEntryWindow();
    }
  }

  public registerAddEntry(event: KeyboardEvent) {
    if (event.key === 'i' && event.ctrlKey) {
      this.passwordStore.openAddEntryWindow();
    }
  }
}
