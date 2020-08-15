import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { DarwinHotkeyProvider } from './darwin-hotkey-provider';
import { IHotkeyProvider } from './hotkey-provider.model';
import { WindowsHotkeyProvider } from './windows-hotkey-provider';
import { DialogsService } from '../dialogs.service';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  private hotkeyProvider: IHotkeyProvider;
  public deleteShortcutLabel: string;

  constructor(
    private databaseService: DatabaseService,
    private dialogsService: DialogsService
  ) {
    if (process.platform === 'darwin') {
      this.hotkeyProvider = new DarwinHotkeyProvider(
        this.databaseService,
        this.dialogsService
      );
      this.deleteShortcutLabel = 'Delete (Cmd + ⌫)';
    } else {
      this.hotkeyProvider = new WindowsHotkeyProvider(
        this.databaseService,
        this.dialogsService
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
