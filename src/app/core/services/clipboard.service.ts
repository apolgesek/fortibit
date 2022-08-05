import { Inject, Injectable } from '@angular/core';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { NotificationService } from '@app/core/services/notification.service';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '../models';
@Injectable({
  providedIn: 'root'
})

export class ClipboardService {
  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly notificationService: NotificationService,
  ) {}

  async copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry) {
    let value = entry[property];

    if (property === 'password') {
      value = await this.communicationService.ipcRenderer.invoke(IpcChannel.DecryptPassword, entry[property]);
    }

    entry.lastAccessDate = new Date();
    const isCopied = await this.communicationService.ipcRenderer.invoke(IpcChannel.CopyCliboard, value);

    if (isCopied) {
      this.notificationService.add({
        message: property.substr(0, 1).toUpperCase()
          + property.substr(1)
          + ' copied',
        alive: 15000,
        type: 'success',
        showCount: true
      });
    }
  }
}