import { DatabaseService } from "../database.service";
import { DialogsService } from "../dialogs.service";
import { IHotkeyStrategy } from "./hotkey-strategy.model";

export class WindowsHotkeyStrategy implements IHotkeyStrategy {
    constructor(
      private databaseService: DatabaseService,
      private dialogsService: DialogsService
    ) {}
  
    public registerSaveDatabase(event: KeyboardEvent) {
      if (event.key === 's' && event.ctrlKey) {
        !this.databaseService.file ? this.dialogsService.openMasterPasswordWindow() : this.databaseService.saveDatabase(null);
      }
    }
  
    public registerDeleteEntry(event: KeyboardEvent) {
      if (event.key === 'Delete') {
        this.dialogsService.openDeleteEntryWindow();
      }
    }
  
    public registerEditEntry(event: KeyboardEvent) {
      if (
          event.key === 'Enter'
          && !document.querySelector('.ui-dialog')
          && this.databaseService.selectedPasswords.length === 1
          && !this.databaseService.isRenameModeOn
      ) {
        this.databaseService.editedEntry = this.databaseService.selectedPasswords[0];
        this.dialogsService.openEntryWindow();
      }
    }
  
    public registerAddEntry(event: KeyboardEvent) {
      if (event.key === 'i' && event.ctrlKey && !document.querySelector('.ui-dialog')) {
        this.dialogsService.openEntryWindow();
      }
    }
  
    public registerMoveUpEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowUp' && event.altKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.moveUp();
        event.preventDefault();
      }
    }
  
    public registerMoveTopEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowUp' && event.ctrlKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.moveTop();
        event.preventDefault();
      }
    }
  
    public registerMoveDownEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowDown' && event.altKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.moveDown();
        event.preventDefault();
      }
    }
  
    public registerMoveBottomEntry(event: KeyboardEvent) {
      if (event.key === 'ArrowDown' && event.ctrlKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.moveBottom();
        event.preventDefault();
      }
    }
  
    public registerSelectAllEntries(event: KeyboardEvent) {
      if (event.key === 'a' && event.ctrlKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.selectedPasswords = [];
        this.databaseService.selectedPasswords.push(...this.databaseService.selectedCategory.data);
        event.preventDefault();
      }
    }
  }