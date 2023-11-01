import { Injectable } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { IpcChannel } from '@shared-renderer/index';

@Injectable()
export class ElectronService implements IMessageBroker {
  ipcRenderer: any;
  platform: string;

  constructor() {
    this.ipcRenderer = (window as any).api;
  }

  async getPlatform(): Promise<string> {
    this.platform = await this.ipcRenderer.invoke(IpcChannel.GetPlatformInfo);
    return this.platform;
  }
}
