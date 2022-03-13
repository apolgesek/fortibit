import { Injectable } from '@angular/core';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { NotificationService } from '@app/core/services/notification.service';
@Injectable({
  providedIn: 'root'
})

export class ClipboardService {
  constructor(
    private readonly electronService: ElectronService,
    private readonly notificationService: NotificationService,
  ) {}

  async copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry, value: string) {
    if (!value) {
      return;
    }

    if (property === 'password') {
      value = await this.electronService.ipcRenderer.invoke(IpcChannel.DecryptPassword, value);
    }

    entry.lastAccessDate = new Date();
    const isCopied = await this.electronService.ipcRenderer.invoke(IpcChannel.CopyCliboard, value);

    if (isCopied) {
      this.notificationService.add({
        message: property.substr(0, 1).toUpperCase()
          + property.substr(1)
          + ' copied',
        alive: 15000,
        type: 'success'
      });
    }
  }
}