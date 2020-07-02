import { Injectable } from '@angular/core';
import { PasswordStoreService } from './password-store.service';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  private hotkeyProvider: IHotkeyProvider;
  public deleteShortcutLabel: string;

  constructor(
    private passwordStore: PasswordStoreService,
  ) {
    if (process.platform === 'darwin') {
      this.hotkeyProvider = new DarwinHotkeyProvider(
        this.passwordStore
      );
      this.deleteShortcutLabel = 'Delete (Cmd + ⌫)';
    } else {
      this.hotkeyProvider = new WindowsHotkeyProvider(
        this.passwordStore
      );
      this.deleteShortcutLabel = 'Delete (Del)';
    }
  }

  getMultiselectionKey(event: MouseEvent): boolean {
    return process.platform === 'darwin' ? event.metaKey : event.ctrlKey;
  }

  intercept(event: KeyboardEvent) {
    this.hotkeyProvider.registerSaveDatabase(event);
    this.hotkeyProvider.registerDeleteEntry(event);
    this.hotkeyProvider.registerEditEntry(event);
    this.hotkeyProvider.registerAddEntry(event);
    this.hotkeyProvider.registerSelectAllEntries(event);
    this.hotkeyProvider.registerMoveUpEntry(event);
    this.hotkeyProvider.registerMoveTopEntry(event);
    this.hotkeyProvider.registerMoveDownEntry(event);
    this.hotkeyProvider.registerMoveBottomEntry(event);
  }
}

interface IHotkeyProvider {
  registerSaveDatabase: (event: KeyboardEvent) => void;
  registerDeleteEntry: (event: KeyboardEvent) => void;
  registerEditEntry: (event: KeyboardEvent) => void;
  registerAddEntry: (event: KeyboardEvent) => void;
  registerMoveUpEntry: (event: KeyboardEvent) =>  void;
  registerMoveTopEntry: (event: KeyboardEvent) =>  void;
  registerMoveDownEntry: (event: KeyboardEvent) =>  void;
  registerMoveBottomEntry: (event: KeyboardEvent) =>  void;
  registerSelectAllEntries: (event: KeyboardEvent) => void;
}

class DarwinHotkeyProvider implements IHotkeyProvider {
  constructor(
    private passwordStore: PasswordStoreService,
  ) {}

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
    if (
      event.key === 'Enter'
      && !this.passwordStore.isDialogOpened
      && this.passwordStore.selectedPasswords.length === 1
      && !this.passwordStore.isRenameModeOn
    ) {
      this.passwordStore.openEditEntryWindow();
    }
  }

  public registerAddEntry(event: KeyboardEvent) {
    if (event.key === 'i' && event.metaKey && !this.passwordStore.isDialogOpened) {
      this.passwordStore.openAddEntryWindow();
    }
  }

  public registerMoveUpEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' && event.altKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveUp();
      event.preventDefault();
    }
  }

  public registerMoveTopEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' && event.metaKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveTop();
      event.preventDefault();
    }
  }

  public registerMoveDownEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && event.altKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveDown();
      event.preventDefault();
    }
  }

  public registerMoveBottomEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && event.metaKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveBottom();
      event.preventDefault();
    }
  }

  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key === 'a' && event.metaKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.selectedPasswords = [];
      this.passwordStore.selectedPasswords.push(...this.passwordStore.selectedCategory.data);
      event.preventDefault();
    }
  }
}

class WindowsHotkeyProvider implements IHotkeyProvider {
  constructor(
    private passwordStore: PasswordStoreService,
  ) {}

  public registerSaveDatabase(event: KeyboardEvent) {
      if (event.key === 's' && event.ctrlKey) {
        this.passwordStore.trySaveDatabase();
      }
  }

  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.key === 'Delete') {
      this.passwordStore.openDeleteEntryWindow();
    }
  }

  public registerEditEntry(event: KeyboardEvent) {
    if (event.key === 'Enter'
        && !this.passwordStore.isDialogOpened
        && this.passwordStore.selectedPasswords.length === 1
        && !this.passwordStore.isRenameModeOn
      ) {
      this.passwordStore.openEditEntryWindow();
    }
  }

  public registerAddEntry(event: KeyboardEvent) {
    if (event.key === 'i' && event.ctrlKey) {
      this.passwordStore.openAddEntryWindow();
    }
  }

  public registerMoveUpEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' && event.altKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveUp();
      event.preventDefault();
    }
  }

  public registerMoveTopEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' && event.ctrlKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveTop();
      event.preventDefault();
    }
  }

  public registerMoveDownEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && event.altKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveDown();
      event.preventDefault();
    }
  }

  public registerMoveBottomEntry(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && event.ctrlKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.moveBottom();
      event.preventDefault();
    }
  }

  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key === 'a' && event.ctrlKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.selectedPasswords = [];
      this.passwordStore.selectedPasswords.push(...this.passwordStore.selectedCategory.data);
      event.preventDefault();
    }
  }
}
