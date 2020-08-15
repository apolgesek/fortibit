import { DatabaseService } from "../database.service";
import { DialogsService } from "../dialogs.service";
import { IHotkeyProvider } from "./hotkey-provider.model";

export class DarwinHotkeyProvider implements IHotkeyProvider {
    constructor(
      private databaseService: DatabaseService,
      private dialogsService: DialogsService
    ) {}
  
    public registerSaveDatabase(event: KeyboardEvent) {
        if (event.key === 's' && event.metaKey) {
          this.databaseService.trySaveDatabase();
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
        && !this.dialogsService.isEntryDialogShown
        && this.databaseService.selectedPasswords.length === 1
        && !this.databaseService.isRenameModeOn
      ) {
        this.databaseService.editedEntry = this.databaseService.selectedPasswords[0];
        this.dialogsService.openEntryWindow();
      }
    }
  
    public registerAddEntry(event: KeyboardEvent) {
      if (event.key === 'i' && event.metaKey && !this.dialogsService.isEntryDialogShown) {
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
      if (event.key === 'ArrowUp' && event.metaKey && this.databaseService.selectedPasswords.length) {
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
      if (event.key === 'ArrowDown' && event.metaKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.moveBottom();
        event.preventDefault();
      }
    }
  
    public registerSelectAllEntries(event: KeyboardEvent) {
      if (event.key === 'a' && event.metaKey && this.databaseService.selectedPasswords.length) {
        this.databaseService.selectedPasswords = [];
        this.databaseService.selectedPasswords.push(...this.databaseService.selectedCategory.data);
        event.preventDefault();
      }
    }
  }