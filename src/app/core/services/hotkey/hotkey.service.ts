import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { IHotkeyConfiguration, IHotkeyStrategy } from '@app/core/models';
import { DialogsService } from '../dialogs.service';
import { StorageService } from '../storage.service';
import { DarwinHotkeyStrategy } from './darwin-hotkey-strategy';
import { WindowsHotkeyStrategy } from './windows-hotkey-strategy';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {
  private hotkeyStrategy: IHotkeyStrategy;

  public configuration: IHotkeyConfiguration;
  public deleteShortcutLabel: string;

  constructor(
    private storageService: StorageService,
    private dialogsService: DialogsService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.create();
  }

  private create() {
    switch (process.platform) {
      case 'darwin':
        this.hotkeyStrategy = new DarwinHotkeyStrategy(
          this.storageService,
          this.dialogsService
        );

        this.configuration = {
          deleteLabel: 'Delete (Cmd + ⌫)',
          moveTopLabel: 'Move top (Cmd + ↑)',
          moveBottomLabel: 'Move bottom (Cmd + ↓)',
        };

        break;
      case 'win32':
        this.hotkeyStrategy = new WindowsHotkeyStrategy(
          this.storageService,
          this.dialogsService
        );

        this.configuration = {
          deleteLabel: 'Delete (Del)',
          moveTopLabel: 'Move top (Ctrl + ↑)',
          moveBottomLabel: 'Move bottom (Ctrl + ↓)',
        };

      default:
        break;
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
