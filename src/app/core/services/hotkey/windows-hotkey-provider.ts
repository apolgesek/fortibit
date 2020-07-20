import { PasswordStoreService } from "../password-store.service";
import { IHotkeyProvider } from "./hotkey-provider.model";

export class WindowsHotkeyProvider implements IHotkeyProvider {
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