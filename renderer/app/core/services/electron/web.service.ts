import { Injectable } from "@angular/core";
import { ICommunicationService } from "@app/core/models";
import { IpcChannel } from "@shared-renderer/ipc-channel.enum";
import * as zxcvbn from 'zxcvbn';
import { IAppConfig } from "../../../../../app-config";

@Injectable()
export class WebService implements ICommunicationService {
  ipcRenderer: any;

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

        return Promise.resolve('')
      },

      send: (channel: IpcChannel, ...args) => {},
      on: (channel: IpcChannel, ...args) => {}
    };
  }

  getPlatform(): string {
    return 'web';
  }

  getPasswordGenerator(): any {
    return zxcvbn;
  }
}