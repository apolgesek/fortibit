/* eslint-disable @typescript-eslint/no-var-requires */

import { Cron } from "croner";
import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import { IpcMainEvent, IpcMainInvokeEvent } from 'electron/main';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { basename, join } from 'path';
import { IpcChannel } from '../shared-models';
import { SingleInstanceServices } from './dependency-injection';
import { ProcessArgument } from './process-argument.enum';
import { IAutotypeService } from './services/autotype';
import { IConfigService } from './services/config';
import { IDatabaseService } from './services/database';
import { IEncryptionEventWrapper, MessageEventType } from './services/encryption';
import { IPerformanceService } from './services/performance/performance-service.model';
import { IUpdateService } from './services/update';
import { IWindowService } from './services/window';

class MainProcess {
  private readonly _services: SingleInstanceServices;
  private _fileArg: string;

  private get _databaseService(): IDatabaseService {
    return this._services.get(IDatabaseService);
  }  

  private get _windowService(): IWindowService {
    return this._services.get(IWindowService);
  }  

  private get _encryptionEventWrapper(): IEncryptionEventWrapper {
    return this._services.get(IEncryptionEventWrapper);
  }

  private get _updateService(): IUpdateService {
    return this._services.get(IUpdateService);
  }

  private get _performanceService(): IPerformanceService {
    return this._services.get(IPerformanceService);
  }

  private get _configService(): IConfigService {
    return this._services.get(IConfigService);
  }

  private get _autotypeService(): IAutotypeService {
    return this._services.get(IAutotypeService);
  }

  constructor() {
    this._services = new SingleInstanceServices();
    this._fileArg = process.argv.find(x => x.endsWith(this._services.get(IConfigService).appConfig.fileExtension));
  
    this.registerAppEvents();
  }

  private registerAppEvents() {
    app.on('second-instance', (event: Electron.Event, argv) => {
      const windowRef = this._windowService.createMainWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve)));
      const filePath = argv.find(x => x.endsWith(this._configService.appConfig.fileExtension));
      this.setFile(windowRef, filePath);

      this._windowService.loadWindow(windowRef);
    });
    app.on('open-file', (event, path) => {
      event.preventDefault();
      this._fileArg = path;
    });
    app.once('ready', () => this.onReady());

    // exit listeners
    app.once('window-all-closed', () => this.exitApp());
    ['SIGINT', 'SIGTERM', 'SIGQUIT', 'uncaughtException'].forEach(event => {
      process.once(event, () => this.exitApp());
    });
  }

  private exitApp() {
    globalShortcut.unregisterAll();
    this._databaseService.clear();
    app.exit();
  }

  private onReady() {
    const windowRef = this._windowService.createMainWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.PerfLog)));
    const entrySelectWindowRef = this._windowService.createEntrySelectWindow();
    this.registerIpcEventListeners();
    this.registerScheduledTasks();

    if (this._configService.appConfig.autoTypeEnabled) {
      this._autotypeService.registerAutocompleteShortcut();
    }

    this.setFile(windowRef, this._fileArg);

    const windowLoaded = this._windowService.loadWindow(windowRef);
    const entrySelectWindowLoaded = this._windowService.loadWindow(entrySelectWindowRef, 'entry-select');
    
    windowLoaded.then(() => {
      this._performanceService.mark('firstWindowLoaded');
    }).catch(err => {
      console.log(err);
    });
  }

  private setFile(windowRef: BrowserWindow, filePath: string) {
    if (filePath) {
      this._databaseService.setDatabaseEntry(windowRef.webContents.id, filePath);
      this._windowService.setTitle(windowRef.id, basename(filePath));
    } else {
      if (!existsSync(this._configService.workspacesPath)) {
        writeFileSync(this._configService.workspacesPath, '{"recentlyOpened": [], "workspace": null}', { encoding: 'utf-8' });
      }

      const workspace = readFileSync(this._configService.workspacesPath, 'utf-8');
      const path = JSON.parse(workspace);

      if (path.workspace && existsSync(path.workspace)) {
        this._databaseService.setDatabaseEntry(windowRef.webContents.id, path.workspace);
        this._windowService.setTitle(windowRef.id, basename(path.workspace));
      }
    }
  }
  
  private registerIpcEventListeners() {
    ipcMain.handle(IpcChannel.GetWhitelistedChannels, () => {
      return Object.values(IpcChannel);
    });

    ipcMain.handle(IpcChannel.GetPlatformInfo, () => {
      return platform();
    });

    ipcMain.on(IpcChannel.DropFile, (event: IpcMainEvent, filePath: string) => {
      this._databaseService.setDatabaseEntry(event.sender.id, filePath);
      this._windowService.setTitle(event.sender.id, basename(filePath));

      event.reply(IpcChannel.ProvidePassword, this._databaseService.getFilePath(event.sender.id));
    });

    ipcMain.handle(IpcChannel.EncryptPassword, async (event, password) => {
      const encryptionEvent = { type: MessageEventType.EncryptString, plain: password };
      const response = await this._encryptionEventWrapper.processEventAsync(encryptionEvent, this._windowService.getWindowByWebContentsId(event.sender.id).key ) as { encrypted: string };

      return response.encrypted;
    });

    ipcMain.handle(IpcChannel.DecryptPassword, async (event, password) => {
      const encryptionEvent = { type: MessageEventType.DecryptString, encrypted: password };
      const response = await this._encryptionEventWrapper.processEventAsync(encryptionEvent, this._windowService.getWindowByWebContentsId(event.sender.id).key) as { decrypted: string };

      return response.decrypted;
    });

    ipcMain.on(IpcChannel.DecryptDatabase, (event: IpcMainEvent, password: string) => {
      this._databaseService.decryptDatabase(event, password);
    });

    ipcMain.handle(IpcChannel.CheckOpenMode, (event: IpcMainInvokeEvent) => {
      return this._databaseService.getFilePath(event.sender.id);
    });

    ipcMain.handle(IpcChannel.GetAppConfig, () => {
      return this._configService.appConfig;
    });

    ipcMain.on(IpcChannel.OpenUrl, async (_, url: string) => {
      if (!/^https?/.test(url)) {
        url = 'http://' + url;
      }

      shell.openExternal(url);
    });

    ipcMain.once(IpcChannel.UpdateAndRelaunch, () => {
      this._updateService.updateAndRelaunch();
    });

    ipcMain.handle(IpcChannel.ValidatePassword, (event: IpcMainEvent, password: string): boolean => {
      if (!password?.length) {
        return false;
      }

      return password === this._databaseService.getPassword(event.sender.id);
    });
  }

  private registerScheduledTasks() {
    const updatePasswordExpiration = new Cron('0 0 * * *', () => {
      this._windowService.windows.forEach(window => {
        window.browserWindow.webContents.send(IpcChannel.UpdateExpiration);
      });
    });
  }
}

export function bootstrapApp() {
  new MainProcess();
}