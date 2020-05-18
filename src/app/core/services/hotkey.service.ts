import { Injectable } from '@angular/core';
import { PasswordStoreService } from './password-store.service';
import { DialogService, ConfirmationService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  private hotkeyProvider: IHotkeyProvider;

  constructor(
    private passwordStore: PasswordStoreService,
    private dialogService: DialogService,
    private confirmationService: ConfirmationService
  ) {
    if (process.platform === 'darwin') {
      this.hotkeyProvider = new DarwinHotkeyProvider(
        this.passwordStore,
        this.dialogService,
        this.confirmationService
      );
    } else {
      this.hotkeyProvider = new WindowsHotkeyProvider(this.passwordStore, this.dialogService);
    }
  }

  intercept(event: KeyboardEvent) {
    this.hotkeyProvider.registerSaveDatabase(event);
    this.hotkeyProvider.registerDeleteEntry(event);
    this.hotkeyProvider.registerEditEntry(event);
    this.hotkeyProvider.registerAddEntry(event);
    this.hotkeyProvider.registerSelectAllEntries(event);
  }
}

interface IHotkeyProvider {
  registerSaveDatabase: (event: any) => void;
  registerDeleteEntry: (event: any) => void;
  registerEditEntry: (event: any) => void;
  registerAddEntry: (event: any) => void;
  registerSelectAllEntries: (event: any) => void;
}

class DarwinHotkeyProvider implements IHotkeyProvider {
  constructor(
    private passwordStore: PasswordStoreService,
    private dialogService: DialogService,
    private confirmationService: ConfirmationService
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

  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key === 'a' && event.metaKey && this.passwordStore.selectedPasswords.length) {
      this.passwordStore.selectedPasswords.push(...this.passwordStore.selectedCategory.data);
      event.preventDefault();
    }
  }
}

class WindowsHotkeyProvider implements IHotkeyProvider {
  constructor(
    private passwordStore: PasswordStoreService,
    private dialogService: DialogService,
  ) {}

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

  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key === 'a' && event.ctrlKey) {
      this.passwordStore.selectedPasswords = this.passwordStore.selectedCategory.data;
    }
  }
}
