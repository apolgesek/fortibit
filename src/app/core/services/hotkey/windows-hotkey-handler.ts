import { StorageService } from '../storage.service';
import { DialogsService } from '../dialogs.service';
import { IHotkeyHandler } from '../../models/hotkey-handler.model';

export class WindowsHotkeyHandler implements IHotkeyHandler {
  constructor(
    private storageService: StorageService,
    private dialogsService: DialogsService
  ) {}
  
  public registerSaveDatabase(event: KeyboardEvent) {
    if (event.key === 's' && event.ctrlKey) {
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
    if (event.key === 'i' && event.ctrlKey) {
      this.dialogsService.openEntryWindow();
    }
  }
  
  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key === 'a' && event.ctrlKey && this.storageService.selectedPasswords.length) {
      this.storageService.selectedPasswords = [];
      this.storageService.selectedPasswords.push(...this.storageService.passwordEntries);
      event.preventDefault();
    }
  }
}