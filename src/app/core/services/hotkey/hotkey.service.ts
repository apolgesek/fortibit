import { Injectable } from '@angular/core';
import { IHotkeyConfiguration, IHotkeyHandler } from '@app/core/models';
import { DialogsService } from '@app/core/services/dialogs.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/storage.service';
import { ElectronService } from '..';
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
    private readonly storageService: StorageService,
    private readonly dialogsService: DialogsService,
    private readonly searchService: SearchService,
    private readonly electronService: ElectronService
  ) { 
    switch (this.electronService.os.platform()) {
    case 'win32':
      this.hotkeyStrategy = new WindowsHotkeyHandler(
        this.storageService,
        this.dialogsService,
        this.searchService
      );
      break;
    }
  }

  getMultiselectionKey(event: MouseEvent): boolean {
    return this.electronService.os.platform() === 'darwin' ? event.metaKey : event.ctrlKey;
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
    this.hotkeyStrategy.registerFindEntries(event);
    this.hotkeyStrategy.registerFindGlobalEntries(event);
  }
}
