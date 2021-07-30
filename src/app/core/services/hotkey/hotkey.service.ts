import { Injectable } from '@angular/core';
import { IHotkeyConfiguration, IHotkeyHandler } from '@app/core/models';
import { DialogsService } from '../dialogs.service';
import { StorageService } from '../storage.service';
import { WindowsHotkeyHandler } from './windows-hotkey-handler';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {
  public configuration: IHotkeyConfiguration = {
    deleteLabel: 'Delete (Del)',
    moveTopLabel: 'Move top (Ctrl + ↑)',
    moveBottomLabel: 'Move bottom (Ctrl + ↓)',
  };

  private hotkeyStrategy: IHotkeyHandler | undefined;

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

    if (!this.hotkeyStrategy) {
      throw new Error('Hotkey strategy was not set!');
    }

    this.hotkeyStrategy.registerSaveDatabase(event);
    this.hotkeyStrategy.registerDeleteEntry(event);
    this.hotkeyStrategy.registerEditEntry(event);
    this.hotkeyStrategy.registerAddEntry(event);
    this.hotkeyStrategy.registerSelectAllEntries(event);
  }
}
