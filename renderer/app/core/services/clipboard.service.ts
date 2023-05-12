import { Inject, Injectable } from '@angular/core';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { NotificationService } from '@app/core/services/notification.service';
import { ICommunicationService } from '../models';
import { CommunicationService } from 'injection-tokens';
import { ConfigService } from './config.service';
import { IAppConfig } from '../../../../app-config';
@Injectable({
  providedIn: 'root'
})

export class ClipboardService {
  private config: IAppConfig;
  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService
  ) {
    this.configService.configLoadedSource$.subscribe((config) => {
      this.config = config
    });
  }

  async copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry) {
    let value = entry[property];

    if (property === 'password') {
      value = await this.communicationService.ipcRenderer.invoke(IpcChannel.DecryptPassword, entry[property]);
    }

    const isCopied = this.communicationService.ipcRenderer.invoke(IpcChannel.CopyCliboard, value);

    if (isCopied) {
      this.notificationService.add({
        message: property.substr(0, 1).toUpperCase()
          + property.substr(1)
          + ' copied',
        alive: this.config.clipboardClearTimeMs,
        type: 'success',
        showCount: true
      });
    }
  }
}