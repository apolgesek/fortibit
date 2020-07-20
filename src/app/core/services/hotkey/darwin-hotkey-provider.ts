import { PasswordStoreService } from "../password-store.service";
import { IHotkeyProvider } from "./hotkey-provider.model";

export class DarwinHotkeyProvider implements IHotkeyProvider {
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