/* eslint-disable @typescript-eslint/no-var-requires */

import { app, globalShortcut, ipcMain } from 'electron';
import { appConfig } from '../config';
import { randomBytes } from 'crypto';
import { IpcChannel } from '../shared-models/index';
import { EventType } from '../src/app/core/enums';
import { EncryptionService, INativeApi, IWindow, MessageEventType, WinApiService, WindowService } from './services';
import { ISendInput } from './services/send-input/send-input.model';
import { Keys, SendInputService } from './services/send-input/send-input.service';
import { IpcMainEvent, IpcMainInvokeEvent } from 'electron/main';
import { FileManagementService } from './services/file/file-management.service';
import { IEncryptionProcessManager } from './services/encryption/encryption-service.model';
import { StateStore } from './store/state-store';

class MainProcess {
  private readonly _version = app.getVersion();
  private readonly _args = process.argv.slice(1);
  private readonly _serve = this._args.some(val => val === '--serve');
  private readonly _fileArg = process.argv.find(x => x.endsWith(appConfig.fileExtension));

  private _nativeApiService: INativeApi;
  private _sendInputService: ISendInput;
  private _fileManagementService: FileManagementService;
  private _windowService: IWindow;
  private _encryptionProcessManager: IEncryptionProcessManager;

  private _clearClipboardTimeout: NodeJS.Timeout;
  private _isAutoTypeRegistered = false;

  async init(): Promise<void> {
    StateStore.memoryKey = randomBytes(8).toString('hex');
    StateStore.fileMap = new Map<number, string>([]);
    StateStore.windows = [];

    app.on('second-instance', (_, argv) => {
      StateStore.windows.push(this._windowService.createWindow(this._serve));

      const windowIndex = StateStore.windows.length - 1;

      this._windowService.loadWindow(StateStore.windows[windowIndex]);

      const filePath = argv.find(x => x.endsWith(appConfig.fileExtension));

      if (filePath) {
        StateStore.fileMap.set(StateStore.windows[windowIndex].webContents.id, filePath);
      }

      StateStore.windows[windowIndex].on('closed', () => {
        StateStore.windows.splice(windowIndex, 1);
      });
    });

    app.on('ready', () => this.onReady());

    app.on('window-all-closed', () => {
      globalShortcut.unregisterAll();
      app.quit();
    });
  }

  private onReady() {
    this.initializeServices();
    this.registerIpcEventListeners();
    this.registerAutocompleteHandler();

    StateStore.windows.push(this._windowService.createWindow(this._serve));

    const windowIndex = StateStore.windows.length - 1;

    StateStore.windows[windowIndex].webContents.on('dom-ready', () => {
      this._nativeApiService = new WinApiService();
      this._sendInputService = new SendInputService(this._nativeApiService);
    });

    this._windowService.loadWindow(StateStore.windows[windowIndex]);

    StateStore.windows[windowIndex].on('closed', () => {
      StateStore.windows.splice(windowIndex, 1);
    });

    if (this._fileArg) {
      StateStore.fileMap.set(StateStore.windows[windowIndex].webContents.id, this._fileArg);
    }
  }

  private registerAutocompleteHandler() {
    this._isAutoTypeRegistered = globalShortcut.register(appConfig.autocompleteShortcut, () => {
      const activeWindowTitle = this._nativeApiService.getActiveWindowTitle();

      const windowsListeners = [];

      StateStore.windows.forEach((win) => {
        const listener = async (_, channel: string, entry) => {
          if (channel === IpcChannel.AutocompleteEntry && entry) {
            const encryptionProcess = await this._encryptionProcessManager.createEncryptionProcess();
            encryptionProcess.send({ type: MessageEventType.DecryptString, encrypted: entry.password, memoryKey: StateStore.memoryKey });
            encryptionProcess.once('message', async (decrypted: string) => {
              await this._sendInputService.sleep(200);
              await this._sendInputService.typeWord(entry.username);
              await this._sendInputService.pressKey(Keys.Tab);
              await this._sendInputService.typeWord(decrypted);
              await this._sendInputService.pressKey(Keys.Enter);
            });

            windowsListeners.forEach((l, i) => StateStore.windows[i].webContents.off('ipc-message', l));
          }
        };

        windowsListeners.push(listener);

        win.webContents.on('ipc-message', listener);
      });

      StateStore.windows.forEach((win) => {
        win.webContents.send(IpcChannel.GetAutotypeFoundEntry, activeWindowTitle);
      });
    });
  }

  private initializeServices() {
    this._windowService = new WindowService(this._serve);
    this._encryptionProcessManager = new EncryptionService();
    this._fileManagementService = new FileManagementService(this._encryptionProcessManager);
  }
  
  private registerIpcEventListeners() {
    ipcMain.on(IpcChannel.Minimize, (event: IpcMainEvent) => {
      const win = StateStore.windows.find(x => x.webContents.id === event.sender.id);
      win.minimize();
    });

    ipcMain.on(IpcChannel.Maximize, (event: IpcMainEvent) => {
      const win = StateStore.windows.find(x => x.webContents.id === event.sender.id);
      win.setFullScreen(!win.isFullScreen());
    });

    ipcMain.on(IpcChannel.Close, (event: IpcMainEvent) => {
      const win = StateStore.windows.find(x => x.webContents.id === event.sender.id);
    
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      }

      win.close();
    });

    ipcMain.on(IpcChannel.SaveFile, async (event: IpcMainEvent, { database, newPassword }: { database: JSON; newPassword: string; }) => {
      await this._fileManagementService.saveFile(event, database, newPassword);
    });

    ipcMain.handle(IpcChannel.CopyCliboard, async (_, value: string) => {
      const { clipboard } = await import('electron');

      clearTimeout(this._clearClipboardTimeout);
      clipboard.writeText(value);

      this._clearClipboardTimeout = setTimeout(() => {
        clipboard.clear();
      }, appConfig.clipboardClearTimeMs);

      return true;
    });

    ipcMain.on(IpcChannel.DropFile, (event: IpcMainEvent, filePath: string) => {
      if (!filePath.endsWith(appConfig.fileExtension)) {
        return;
      }

      StateStore.fileMap.set(event.sender.id, filePath);

      event.reply(IpcChannel.ProvidePassword, StateStore.fileMap.get(event.sender.id));
    });

    ipcMain.on(IpcChannel.OpenFile, async (event: IpcMainEvent) => {
      await this._fileManagementService.openFile(event);
    });

    ipcMain.handle(IpcChannel.EncryptPassword, async (_, password) => {
      const encryptionProcess = await this._encryptionProcessManager.createEncryptionProcess();
      const encryptedString: Promise<string> = new Promise((resolve) => {
        encryptionProcess.send({ type: MessageEventType.EncryptString, plain: password, memoryKey: StateStore.memoryKey });
        encryptionProcess.once('message', (encrypted: string) => {
          resolve(encrypted);
        });
      });

      return await encryptedString;
    });

    ipcMain.handle(IpcChannel.DecryptPassword, async (_, password) => {
      const encryptionProcess = await this._encryptionProcessManager.createEncryptionProcess();
      const decryptedString: Promise<string> = new Promise((resolve) => {
        encryptionProcess.send({ type: MessageEventType.DecryptString, encrypted: password, memoryKey: StateStore.memoryKey });
        encryptionProcess.once('message', (decrypted: string) => {
          resolve(decrypted);
        });
      });

      return await decryptedString;
    });

    ipcMain.on(IpcChannel.DecryptDatabase, (event: IpcMainEvent, password: string) => {
      this._fileManagementService.decryptDatabase(event, password);
    });

    ipcMain.handle(IpcChannel.CheckOpenMode, (event: IpcMainInvokeEvent) => {
      return StateStore.fileMap.get(event.sender.id);
    });

    ipcMain.handle(IpcChannel.GetAppConfig, () => {
      return {
        version: this._version,
        autocompleteShortcut: appConfig.autocompleteShortcut,
        autocompleteRegistered: this._isAutoTypeRegistered
      };
    });

    ipcMain.on(IpcChannel.OpenUrl, async (_, url: string) => {
      const { shell } = await import('electron');
      shell.openExternal(url.includes('http') ? url : 'http://' + url);
    });

    ipcMain.on(IpcChannel.TryClose, (ipcEvent: IpcMainEvent, event?: EventType, payload?: unknown) => {
      const win = StateStore.windows.find(x => x.webContents.id === ipcEvent.sender.id);
  
      win.focus();
      win.webContents.send(IpcChannel.OpenCloseConfirmationWindow, event, payload);
    });

    ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
      const win = StateStore.windows.find(x => x.webContents.id === event.sender.id);
      win.close();
    });
  }
}

export function bootstrapApp() {
  const mainProcess = new MainProcess();
  mainProcess.init();
}
