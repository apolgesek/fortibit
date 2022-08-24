import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as zxcvbn from 'zxcvbn';

@Injectable()
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;
  os: typeof os;
  zxcvbn: typeof zxcvbn;
  path: typeof path;

  constructor() {
    this.ipcRenderer = window.require('electron').ipcRenderer;
    this.os = window.require('os');
    this.zxcvbn = window.require('zxcvbn');
    this.path = window.require('path');
  }
}
