/* eslint-disable @typescript-eslint/no-var-requires */

import { ChildProcess, fork } from 'child_process';
import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, SaveDialogReturnValue, shell } from 'electron';
import { FileFilter } from 'electron/main';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { IConfigModel } from './config.model';
import { Encryptor } from './encryption/encryptor';
import { MessageEventType } from './encryption/message-event-type.enum';
import { SimpleEncryptor } from './encryption/simple-encryptor';
import { INativeApi } from './native-api/native-api.model';
import { WinApi } from './native-api/win-api';
import { IpcChannel } from './shared-models/index';
import { EventType } from './src/app/core/enums';

const packageInformation = require('./package.json');
const appConfig: IConfigModel = require('./config.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

enum Keys {
  Tab = 9,
  Enter = 13
}

class Main {
  private readonly version = packageInformation.version as string;
  private readonly memoryKey = Encryptor.getRandomBytes(8).toString('hex');
  private readonly autocompleteKeypressDelayMs = 0;
  private readonly args = process.argv.slice(1);
  private readonly serve = this.args.some(val => val === '--serve');
  private readonly fileLocation = this.serve ? './encryption/main.js' : path.join(__dirname, 'encryption/main.js');
  private readonly fileArg = process.argv.find(x => x.endsWith(appConfig.fileExtension));
  private readonly nativeApi: INativeApi;
  private readonly fileFilters: { filters: FileFilter[] } = {
    filters: [{ name: 'Fortibit database file', extensions: [appConfig.fileExtension] }]
  };

  private win: BrowserWindow;
  private clearClipboardTimeout: NodeJS.Timeout;
  private file: { filePath: string, filename: string };
  private child: ChildProcess;
  private currentPassword: Buffer;
  private wasAppLoaded = false;
  private isAutoTypeRegistered = false;

  constructor() {
    if (this.fileArg) {
      this.file = { filePath: this.fileArg, filename: path.basename(this.fileArg) };
    }

    this.nativeApi = new WinApi();

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

    ipcMain.on(IpcChannel.SaveFile, async (_, { database, newPassword }: { database: JSON, newPassword: string }) => {
      await this.saveFile(database, newPassword);
    });

    ipcMain.handle(IpcChannel.CopyCliboard, (_, value: string) => {
      clearTimeout(this.clearClipboardTimeout);

      clipboard.writeText(value);
  
      this.clearClipboardTimeout = setTimeout(() => {
        clipboard.clear();
      }, appConfig.clipboardClearTimeMs);

      return true;
    });

    ipcMain.on(IpcChannel.DropFile, (_, filePath: string) => {
      console.log(filePath);
      if (!filePath.endsWith(appConfig.fileExtension)) {
        return;
      }

      this.file = { filePath: filePath, filename: path.basename(filePath) };
      this.win.webContents.send(IpcChannel.ProvidePassword, this.file);
    });

    ipcMain.on(IpcChannel.OpenFile, async () => {
      await this.openFile();
    });

    ipcMain.on(IpcChannel.Minimize, () => {
      this.win.minimize();
    });

    ipcMain.on(IpcChannel.Maximize, () => {
      this.win.setFullScreen(!this.win.isFullScreen());
    });

    ipcMain.on(IpcChannel.Close, () => {
      if (this.win.webContents.isDevToolsOpened()) {
        this.win.webContents.closeDevTools();
      }
      this.win.close();
    });

    ipcMain.on(IpcChannel.AutocompleteEntry, async (_, entry) => {
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

    ipcMain.handle(IpcChannel.EncryptPassword, (_, password) => {
      return SimpleEncryptor.encryptString(password, this.memoryKey);
    });

    ipcMain.handle(IpcChannel.DecryptPassword, (_, password) => {
      return SimpleEncryptor.decryptString(password, this.memoryKey);
    });

    ipcMain.on(IpcChannel.DecryptDatabase, (_, password: string) => {
      this.decryptDatabase(password);
    });

    ipcMain.handle(IpcChannel.CheckOpenMode, () => {
      if (this.wasAppLoaded) {
        return;
      }

      this.wasAppLoaded = true;

      return this.file;
    });

    ipcMain.handle(IpcChannel.GetAppConfig, () => {
      return {
        version: this.version,
        autocompleteShortcut: appConfig.autocompleteShortcut,
        autocompleteRegistered: this.isAutoTypeRegistered
      };
    });

    ipcMain.on(IpcChannel.OpenUrl, (_, url: string) => {
      shell.openExternal(url.includes('http') ? url: 'http://' + url);
    });

    ipcMain.on(IpcChannel.TryClose, (_, event?: EventType, payload?: unknown) => {
      this.win.focus();
      this.win.webContents.send(IpcChannel.OpenCloseConfirmationWindow, event, payload);
    });

    ipcMain.on(IpcChannel.Exit, () => {
      app.quit();
    });
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
        backgroundThrottling: false,
        contextIsolation: false
      },
      resizable: true,
      minHeight: 520,
      minWidth: 840,
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
  
    this.isAutoTypeRegistered = globalShortcut.register(appConfig.autocompleteShortcut, async () => {
      const activeWindowTitle = this.nativeApi.getActiveWindowTitle();
      this.win.webContents.send(IpcChannel.GetAutotypeFoundEntry, activeWindowTitle);
    });
  
    this.win.on('closed', () => {
      this.win = null;
    });
  
    return this.win;
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
      await sleep(this.autocompleteKeypressDelayMs);
    }
  }

  private async saveFile(database: JSON, newPassword: string) {
    let savePath: SaveDialogReturnValue = { filePath: this.file?.filePath, canceled: false };

    if (!this.currentPassword) {
      savePath = await dialog.showSaveDialog(this.win, this.fileFilters);

      if (savePath.canceled) {
        this.win.webContents.send(IpcChannel.GetSaveStatus, { status: false });
        return;
      }
    }

    this.child = this.createChildProcess();
    this.child.once('message', (encrypted: string) => {
      const finalFilePath = savePath.filePath.endsWith(appConfig.fileExtension)
        ? savePath.filePath
        : savePath.filePath + '.' + appConfig.fileExtension;

      try {
        fs.writeFileSync(finalFilePath, encrypted, { encoding: 'base64' });
        this.file = { filePath: finalFilePath, filename: path.basename(finalFilePath) };
        this.win.webContents.send(IpcChannel.GetSaveStatus, { status: true, file: this.file });
      } catch (err) {
        this.win.webContents.send(IpcChannel.GetSaveStatus, { status: false, message: err });
      }
    });

    if (!this.currentPassword) {
      this.currentPassword = Buffer.from(newPassword);
    }

    this.child.send({
      database,
      newPassword: newPassword ?? this.currentPassword,
      memoryKey: this.memoryKey,
      type: MessageEventType.EncryptDatabase
    });
  }

  private async openFile() {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      ...this.fileFilters
    });

    if (!fileObj.canceled) {
      this.file = { filePath: fileObj.filePaths[0], filename: path.basename(fileObj.filePaths[0]) };
      this.win.webContents.send(IpcChannel.ProvidePassword, this.file);
    }
  }

  private decryptDatabase(password: string) {
    this.currentPassword = Buffer.from(password);
    const fileData = fs.readFileSync(this.file.filePath, { encoding: 'base64' });

    this.child = this.createChildProcess();

    this.child.once('message', (payload: { decrypted: string, error: string }) => {
      this.win.webContents.send(IpcChannel.DecryptedContent, {
        decrypted: payload.error ? undefined : payload.decrypted,
        file: this.file
      });
    });

    this.child.send({
      fileData,
      password,
      memoryKey: this.memoryKey,
      type: MessageEventType.DecryptDatabase
    });
  }
}

new Main();
