import { Injectable } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { IpcChannel } from '../../../../../shared/ipc-channel.enum';
import { IAppConfig } from '../../../../../app-config';

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
          } as IAppConfig);
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
    return Promise.resolve('web');
  }
}
