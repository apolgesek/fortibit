import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { DialogsService } from '../dialogs.service';
import { DarwinHotkeyStrategy } from './darwin-hotkey-strategy';
import { IHotkeyStrategy } from './hotkey-strategy.model';
import { WindowsHotkeyStrategy } from './windows-hotkey-provider';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  private hotkeyStrategy: IHotkeyStrategy;
  public deleteShortcutLabel: string;

  constructor(
    private databaseService: DatabaseService,
    private dialogsService: DialogsService,
    @Inject(DOCUMENT) private document: Document
  ) {
    if (process.platform === 'darwin') {
      this.hotkeyStrategy = new DarwinHotkeyStrategy(
        this.databaseService,
        this.dialogsService
      );
      this.deleteShortcutLabel = 'Delete (Cmd + ⌫)';
    } else {
      this.hotkeyStrategy = new WindowsHotkeyStrategy(
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
    // disable hotkey if dialog opened
    if (this.document.body.classList.contains('ui-overflow-hidden')) {
      return;
    }
    this.hotkeyStrategy.registerSaveDatabase(event);
    this.hotkeyStrategy.registerDeleteEntry(event);
    this.hotkeyStrategy.registerEditEntry(event);
    this.hotkeyStrategy.registerAddEntry(event);
    this.hotkeyStrategy.registerSelectAllEntries(event);
    this.hotkeyStrategy.registerMoveUpEntry(event);
    this.hotkeyStrategy.registerMoveTopEntry(event);
    this.hotkeyStrategy.registerMoveDownEntry(event);
    this.hotkeyStrategy.registerMoveBottomEntry(event);
  }
}
