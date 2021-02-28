import { ChildProcess, fork } from 'child_process';
import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, SaveDialogReturnValue, shell } from 'electron';
import { Encryptor } from './encryption/encryptor';
import { SimpleEncryptor } from './encryption/simple-encryptor';
import { EventType } from './src/app/core/enums';
import { WinApi } from './native-api/win-api';

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { INativeApi } from './native-api/native-api.model';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

enum Keys {
  Tab = 9,
  Enter = 13
}

class Main {
  private readonly version = require('./package.json').version as string;
  private readonly memoryKey = Encryptor.getRandomBytes(8).toString('hex');
  private readonly fileExtension = '.hslc';
  private readonly keypressDelayMs = 50;
  private readonly args = process.argv.slice(1);
  private readonly serve = this.args.some(val => val === '--serve');
  private readonly fileLocation = this.serve ? './encryption/main.js' : path.join(__dirname, 'encryption/main.js');
  private readonly fileArg = process.argv.find(x => x.endsWith(this.fileExtension));
  private readonly nativeApi: INativeApi;

  private win: BrowserWindow;
  private clearClipboardTimeout: NodeJS.Timeout;
  private file: { filePath: string, filename: string};
  private child: ChildProcess;
  private currentPassword: Buffer;
  private wasAppLoaded = false;

  constructor() {
    if (this.fileArg) {
      this.file = { filePath: this.fileArg, filename: path.basename(this.fileArg) };
    }

    if (process.platform === 'win32') {
      this.nativeApi = new WinApi();
    } else {
      // TODO
    }

    app.on('ready', () => this.createWindow());

    app.on('window-all-closed', () => {
      globalShortcut.unregisterAll();
      
      if (this.currentPassword) {
        this.currentPassword.fill(0);
      }

      app.quit();
    });

    app.on('activate', () => {
      if (this.win === null) {
        this.createWindow();
      }
    });

    ipcMain.on('saveFile', async (_, { passwordList, newPassword }: { passwordList: unknown, newPassword: string }) => {
      let savePath: SaveDialogReturnValue = { filePath: this.file?.filePath, canceled: false };
      const databaseJSON = JSON.stringify(passwordList, (k ,v) => (k === 'parent' ? undefined : v));
      const database = JSON.parse(databaseJSON);

      if (!this.currentPassword) {
        savePath = await dialog.showSaveDialog(this.win, {});
        if (savePath.canceled) {
          this.win.webContents.send('saveStatus', { status: false });
          return;
        }
      }

      this.child = this.createChildProcess();
      this.child.once('message', (encrypted) => {
        const finalFilePath = savePath.filePath.endsWith(this.fileExtension)
          ? savePath.filePath
          : savePath.filePath + this.fileExtension;

        try {
          fs.writeFileSync(finalFilePath, encrypted, { encoding: 'base64' });
          this.file = { filePath: finalFilePath, filename: path.basename(finalFilePath) };
          this.win.webContents.send('saveStatus', { status: true,  message: undefined, file: this.file });
        } catch (err) {
          this.win.webContents.send('saveStatus', { status: false,  message: err });
        }
      });

      this.child.send({ database, newPassword, memoryKey: this.memoryKey, type: 'dbEncrypt' });

      this.currentPassword = Buffer.from(newPassword);
    });

    ipcMain.on('copyToClipboard', (_, value: string) => {
      clearTimeout(this.clearClipboardTimeout);
      clipboard.writeText(value);
      this.clearClipboardTimeout = setTimeout(() => {
        clipboard.clear();
      }, 15000);
    });

    ipcMain.on('onFileDrop', (_, filePath: string) => {
      if (!filePath.endsWith(this.fileExtension)) {
        return;
      }
      this.file = { filePath: filePath, filename: path.basename(filePath) };
      this.win.webContents.send('providePassword', this.file);
    });

    ipcMain.on('openFile', async () => {
      const fileObj = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Haslock database file', extensions: ['hslc'] }]
      });

      if (!fileObj.canceled) {
        this.file = { filePath: fileObj.filePaths[0], filename: path.basename(fileObj.filePaths[0]) };
        this.win.webContents.send('providePassword', this.file);
      }
    });

    ipcMain.on('minimize', () => {
      this.win.minimize();
    });

    ipcMain.on('maximize', () => {
      this.win.setFullScreen(!this.win.isFullScreen());
    });

    ipcMain.on('close', () => {
      if (this.win.webContents.isDevToolsOpened()) {
        this.win.webContents.closeDevTools();
      }
      this.win.close();
    });

    ipcMain.on('receiveSelectedEntry', async (_, entry) => {
      if (!entry) {
        return;
      }

      const password = SimpleEncryptor.decryptString(entry.password, this.memoryKey);

      await sleep(200);
      await this.typeWord(entry.username);
      await this.nativeApi.pressKey(Keys.Tab);
      await this.typeWord(password);
      await this.nativeApi.pressKey(Keys.Enter);
    });

    ipcMain.handle('encryptPassword', (_, password) => {
      return SimpleEncryptor.encryptString(password, this.memoryKey);
    });

    ipcMain.handle('decryptPassword', (_, password) => {
      return SimpleEncryptor.decryptString(password, this.memoryKey);
    });

    ipcMain.on('decryptDatabase', (_, password: string) => {
      this.currentPassword = Buffer.from(password);
      const fileData = fs.readFileSync(this.file.filePath, { encoding: 'base64' });
      
      this.child = this.createChildProcess();
      this.child.once('message', (payload) => {
        if (payload.error) {
          this.win.webContents.send('onContentDecrypt', { decrypted: undefined, file: this.file });
        } else {
          this.win.webContents.send('onContentDecrypt', { decrypted: payload.decrypted, file: this.file });
        }
      });

      this.child.send({ fileData, password, memoryKey: this.memoryKey, type: 'dbDecrypt' });
    });

    ipcMain.handle('appOpenType', () => {
      if (this.wasAppLoaded) {
        return;
      }

      this.wasAppLoaded = true;

      return this.file;
    });

    ipcMain.handle('appVersion', () => {
      return this.version;
    });

    ipcMain.on('openUrl', (_, url: string) => {
      shell.openExternal(url.includes('http') ? url: 'http://' + url);
    });

    ipcMain.on('onCloseAttempt', (_, event?: EventType, payload?: unknown) => {
      this.win.focus();
      this.win.webContents.send('openCloseConfirmationWindow', event, payload);
    });

    ipcMain.on('exit', () => {
      app.quit();
    });
  }
  
  private createChildProcess() {
    return fork(this.fileLocation, [], {
      env: {
        'ELECTRON_RUN_AS_NODE': '1'
      }
    });
  }

  private async typeWord(word: string) {
    for (const char of word.split('')) {
      this.nativeApi.pressPhraseKey(char);
      await sleep(this.keypressDelayMs);
    }
  }

  private createWindow(): BrowserWindow {
    this.win = new BrowserWindow({
      x: 0,
      y: 0,
      width: 960,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        allowRunningInsecureContent: this.serve === true,
        devTools: this.serve === true,
        backgroundThrottling: false
      },
      resizable: true,
      minHeight: 520,
      minWidth: 820,
      frame: false,
    });
  
    if (this.serve) {
      require('electron-reload')(__dirname, {
        electron: require(`${__dirname}/node_modules/electron`)
      });
      this.win.loadURL('http://localhost:4200');
    } else {
      this.win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/index.html'),
        protocol: 'file:',
        slashes: true
      }));
    }
  
    if (this.serve) {
      this.win.webContents.openDevTools();
    }
  
    globalShortcut.register('Alt+H', async () => {
      this.win.webContents.send('getSelectedEntry', this.nativeApi.getActiveWindowTitle());
    });
  
    this.win.on('closed', () => {
      this.win = null;
    });
  
    return this.win;
  }
}

new Main();
