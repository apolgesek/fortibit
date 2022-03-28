import { StorageService } from '@app/core/services/storage.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { IHotkeyHandler } from '../../models/hotkey-handler.model';
import { SearchService } from '@app/core/services/search.service';

export class WindowsHotkeyHandler implements IHotkeyHandler {
  constructor(
    private readonly storageService: StorageService,
    private readonly dialogsService: DialogsService,
    private readonly searchService: SearchService
  ) {}
  
  public registerSaveDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 's' && event.ctrlKey) {
      !this.storageService.file
        ? this.dialogsService.openMasterPasswordWindow()
        : this.storageService.saveDatabase();
    }
  }
  
  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.key === 'Delete' && this.storageService.selectedPasswords.length) {
      this.dialogsService.openDeleteEntryWindow();
    }
  }
  
  public registerEditEntry(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.storageService.selectedPasswords.length === 1) {
      this.storageService.editedEntry = this.storageService.selectedPasswords[0];
      this.dialogsService.openEntryWindow();
    }
  }
  
  public registerAddEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'i' && event.ctrlKey) {
      this.dialogsService.openEntryWindow();
    }
  }
  
  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'a' && event.ctrlKey && this.storageService.selectedPasswords.length) {
      this.storageService.selectedPasswords = [];
      this.storageService.selectedPasswords.push(...this.storageService.passwordEntries);
      event.preventDefault();
    }
  }

  public registerFindEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey) {
      this.searchService.isGlobalSearchMode = false;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerFindGlobalEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey && event.shiftKey) {
      this.searchService.isGlobalSearchMode = true;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }
}