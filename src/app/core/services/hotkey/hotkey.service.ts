import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { IHotkeyConfiguration, IHotkeyHandler } from '@app/core/models';
import { DialogsService } from '../dialogs.service';
import { StorageService } from '../storage.service';
import { WindowsHotkeyHandler } from './windows-hotkey-handler';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {
  public configuration: IHotkeyConfiguration;
  public deleteShortcutLabel: string;

  private hotkeyStrategy: IHotkeyHandler;

  constructor(
    private storageService: StorageService,
    private dialogsService: DialogsService
  ) { }

  public create() {
    switch (process.platform) {
    case 'win32':
      this.hotkeyStrategy = new WindowsHotkeyHandler(
        this.storageService,
        this.dialogsService
      );

      this.configuration = {
        deleteLabel: 'Delete (Del)',
        moveTopLabel: 'Move top (Ctrl + ↑)',
        moveBottomLabel: 'Move bottom (Ctrl + ↓)',
      };
      break;
    default:
      break;
    }
  }

  getMultiselectionKey(event: MouseEvent): boolean {
    return process.platform === 'darwin' ? event.metaKey : event.ctrlKey;
  }

  intercept(event: KeyboardEvent) {
    if (this.dialogsService.isAnyDialogOpened) {
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
