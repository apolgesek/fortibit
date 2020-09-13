import { StorageService } from "../storage.service";
import { DialogsService } from "../dialogs.service";
import { IHotkeyStrategy } from "../../models/hotkey-strategy.model";

export class DarwinHotkeyStrategy implements IHotkeyStrategy {
    constructor(
      private storageService: StorageService,
      private dialogsService: DialogsService
    ) {}
  
    public registerSaveDatabase(event: KeyboardEvent) {
      if (event.key === 's' && event.metaKey) {
        !this.storageService.file ? this.dialogsService.openMasterPasswordWindow() : this.storageService.saveDatabase(null);
      }
    }
  
    public registerDeleteEntry(event: KeyboardEvent) {
      if (event.key === 'Backspace' && event.metaKey) {
        this.dialogsService.openDeleteEntryWindow();
      }
    }
  
    public registerEditEntry(event: KeyboardEvent) {
      if (
        event.key === 'Enter'
        && !document.querySelector('.ui-dialog')
        && this.storageService.selectedPasswords.length === 1
        && !this.storageService.isRenameModeOn
      ) {
        this.storageService.editedEntry = this.storageService.selectedPasswords[0];
        this.dialogsService.openEntryWindow();
      }
    }
  
    public registerAddEntry(event: KeyboardEvent) {
      if (event.key === 'i' && event.metaKey && !document.querySelector('.ui-dialog')) {
        this.dialogsService.openEntryWindow();
      }
    }
  
    public registerMoveUpEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowUp' && event.altKey && this.storageService.selectedPasswords.length) {
        this.storageService.moveUp();
        event.preventDefault();
      }
    }
  
    public registerMoveTopEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowUp' && event.metaKey && this.storageService.selectedPasswords.length) {
        this.storageService.moveTop();
        event.preventDefault();
      }
    }
  
    public registerMoveDownEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowDown' && event.altKey && this.storageService.selectedPasswords.length) {
        this.storageService.moveDown();
        event.preventDefault();
      }
    }
  
    public registerMoveBottomEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowDown' && event.metaKey && this.storageService.selectedPasswords.length) {
        this.storageService.moveBottom();
        event.preventDefault();
      }
    }
  
    public registerSelectAllEntries(event: KeyboardEvent) {
      if (event.key === 'a' && event.metaKey && this.storageService.selectedPasswords.length) {
        this.storageService.selectedPasswords = [];
        this.storageService.selectedPasswords.push(...this.storageService.selectedCategory.data);
        event.preventDefault();
      }
    }
  }