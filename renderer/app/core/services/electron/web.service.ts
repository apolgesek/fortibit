import { Injectable } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { Configuration } from '@config/configuration';
import { IpcChannel } from '@shared-renderer/index';

@Injectable()
export class WebService implements IMessageBroker {
  ipcRenderer: any;
  platform: string;

  constructor() {
    this.ipcRenderer = {
      invoke: (channel: IpcChannel, ...args) => {
        if (channel === IpcChannel.GetAppConfig) {
          return Promise.resolve({
            encryption: {
              lowercase: true,
              uppercase: true,
              numbers: true,
              specialChars: true,
              passwordLength: 15
            }
          } as Configuration);
        } else if (channel === IpcChannel.EncryptPassword) {
          // mock
          return Promise.resolve('test123');
        }

        return Promise.resolve('');
      },

      send: (channel: IpcChannel, ...args) => {},
      on: (channel: IpcChannel, ...args) => {}
    };
  }

  getPlatform(): Promise<string> {
    this.platform = 'web';
    return Promise.resolve(this.platform);
  }
}
