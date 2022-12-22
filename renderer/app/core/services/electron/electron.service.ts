import { Injectable } from '@angular/core';
import { ICommunicationService } from '@app/core/models';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as zxcvbn from 'zxcvbn';

@Injectable()
export class ElectronService implements ICommunicationService {
  ipcRenderer: any;
  os: typeof os;
  zxcvbn: typeof zxcvbn;
  path: typeof path;

  constructor() {
    const electron = window.require('electron');

    this.ipcRenderer = electron.ipcRenderer as typeof ipcRenderer;
    this.os = window.require('os');
    this.zxcvbn = window.require('zxcvbn');
    this.path = window.require('path');
  }

  getPlatform(): string {
    return this.os.platform();
  }

  getPasswordGenerator(): any {
    return this.zxcvbn;
  }
}
