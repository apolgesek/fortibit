import { Injectable } from '@angular/core';
import { PasswordStoreService } from './password-store.service';

@Injectable({
  providedIn: 'root'
})
export class HotkeyService {

  public hotkeys: any[];

  constructor(private passwordService: PasswordStoreService) {}

  saveDatabase = (event: KeyboardEvent) => {
      if (event.key === 's' && this.isMetaKeyPressed(event)) {
        // handle hotkey for password save action
      }
  }

  intercept(event: KeyboardEvent) {
    this.saveDatabase(event);
  }

  private isMetaKeyPressed(event: KeyboardEvent) {
    if (process.platform === 'darwin') {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  }

}
