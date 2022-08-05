import { Injectable } from "@angular/core";
import { IpcChannel } from "@shared-renderer/ipc-channel.enum";
import { IAppConfig } from "../../../../../app-config";
import * as zxcvbn from 'zxcvbn';

@Injectable()
export class WebService {
  ipcRenderer: any;
  os: any;
  zxcvbn: any;

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
          return Promise.resolve('test123');
        }

        return Promise.resolve('')
      },
      send: (channel: IpcChannel, ...args) => {},
      on: (channel: IpcChannel, ...args) => {}
    };
    this.os = { platform: () => 'web' };
    this.zxcvbn = zxcvbn;
  }
}