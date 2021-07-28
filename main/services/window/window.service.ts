/* eslint-disable @typescript-eslint/no-var-requires */
import { BrowserWindow } from 'electron';
import { join } from 'path';
import { format } from 'url';

export class WindowService {
  private readonly _isDevMode: boolean;

  constructor(isDevMode: boolean) {
    this._isDevMode = isDevMode;
  }

  createWindow(): BrowserWindow {
    const tstamp = new Date().getTime();

    const window = new BrowserWindow({
      width: 960,
      height: 600,
      resizable: true,
      minHeight: 520,
      minWidth: 840,
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        allowRunningInsecureContent: this._isDevMode,
        devTools: this._isDevMode,
        backgroundThrottling: false,
        contextIsolation: false,
        partition: `persist:${tstamp}`
      },
    });

    if (this._isDevMode) {
      window.webContents.openDevTools();
    }

    return window;
  }

  loadWindow(windowRef: BrowserWindow): void {
    if (this._isDevMode) {
      require('electron-reload')(global['__basedir'], {
        electron: require(`${global['__basedir']}/node_modules/electron`)
      });

      windowRef.loadURL('http://localhost:4200');

    } else {
      windowRef.loadURL(format({
        pathname: join(`${global['__basedir']}/dist/index.html`),
        protocol: 'file:',
        slashes: true
      }));
    }
  }
}