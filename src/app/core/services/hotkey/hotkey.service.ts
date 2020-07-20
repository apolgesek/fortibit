import { Injectable } from '@angular/core';
import { PasswordStoreService } from '../password-store.service';
import { DarwinHotkeyProvider } from './darwin-hotkey-provider';
import { IHotkeyProvider } from './hotkey-provider.model';
import { WindowsHotkeyProvider } from './windows-hotkey-provider';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  private hotkeyProvider: IHotkeyProvider;
  public deleteShortcutLabel: string;

  constructor(
    private passwordStore: PasswordStoreService,
  ) {
    if (process.platform === 'darwin') {
      this.hotkeyProvider = new DarwinHotkeyProvider(
        this.passwordStore
      );
      this.deleteShortcutLabel = 'Delete (Cmd + ⌫)';
    } else {
      this.hotkeyProvider = new WindowsHotkeyProvider(
        this.passwordStore
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
