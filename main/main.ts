/* eslint-disable @typescript-eslint/no-var-requires */

import { app, globalShortcut, ipcMain, shell } from 'electron';
import { IpcMainEvent, IpcMainInvokeEvent } from 'electron/main';
import { basename } from 'path';
import { IpcChannel } from '../shared-models';
import { SingleInstanceServices } from './dependency-injection';
import { ProcessArgument } from './process-argument.enum';
import { IConfigService } from './services/config';
import { IPerformanceService } from './services/performance/performance-service.model';
import { IIconService } from './services/icon';
import { INativeApiService } from './services/native';
import { IDatabaseService } from './services/database';
import { IWindowService } from './services/window';
import { IEncryptionProcessService, MessageEventType } from './services/encryption';
import { IUpdateService } from './services/update';

class MainProcess {
  private readonly _fileArg: string;
  private readonly _services: SingleInstanceServices;

  private get _nativeApiService(): INativeApiService {
    return this._services.get(INativeApiService);
  }

  private get _databaseService(): IDatabaseService {
    return this._services.get(IDatabaseService);
  }  

  private get _windowService(): IWindowService {
    return this._services.get(IWindowService);
  }  

  private get _encryptionProcessService(): IEncryptionProcessService {
    return this._services.get(IEncryptionProcessService);
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

  private get _iconService(): IIconService {
    return this._services.get(IIconService);
  }

  constructor() {
    this._services = new SingleInstanceServices();
    this._fileArg = process.argv.find(x => x.endsWith(this._services.get(IConfigService).appConfig.fileExtension));
  
    this.registerAppEvents();
  }

  private registerAppEvents() {
    app.on('second-instance', (event: Electron.Event, argv) => {
      const windowRef = this._windowService.createWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve)));
      const windowLoaded = this._windowService.loadWindow(windowRef);

      windowLoaded.then(() => {
        this._updateService.checkForUpdates();
      });

      const filePath = argv.find(x => x.endsWith(this._configService.appConfig.fileExtension));

      if (filePath) {
        this._databaseService.setFilePath(windowRef.webContents.id, filePath);
        this._windowService.setTitle(windowRef.id, basename(filePath));
      }

      windowRef.once('closed', () => {
        this._windowService.removeWindow(windowRef);
      });
    });

    app.once('ready', () => this.onReady());

    app.once('window-all-closed', () => {
      this._databaseService.clear();
      globalShortcut.unregisterAll();

      app.quit();
    });
  }

  private onReady() {
    const windowRef = this._windowService.createWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.PerfLog)));    
    const windowLoaded = this._windowService.loadWindow(windowRef);
    
    windowLoaded.then(() => {
      this._performanceService.mark('firstWindowLoaded');
      this._updateService.checkForUpdates();
    });

    this.registerIpcEventListeners();
    this.registerAutocompleteHandler();

    windowRef.once('closed', () => {
      this._windowService.removeWindow(windowRef);
    });

    if (this._fileArg) {
      this._databaseService.setFilePath(windowRef.webContents.id, this._fileArg);
      this._windowService.setTitle(windowRef.id, basename(this._fileArg));
    }
  }

  private registerAutocompleteHandler() {
    this._configService.appConfig.autocompleteRegistered = globalShortcut.register(this._configService.appConfig.autocompleteShortcut, () => {
      const activeWindowTitle = this._nativeApiService.getActiveWindowTitle();
      this._windowService.registerWindowsAutotypeHandler(activeWindowTitle);
    });
  }
  
  private registerIpcEventListeners() {
    ipcMain.on(IpcChannel.DropFile, (event: IpcMainEvent, filePath: string) => {
      if (!filePath.endsWith(this._configService.appConfig.fileExtension)) {
        return;
      }

      this._databaseService.setFilePath(event.sender.id, filePath);
      this._windowService.setTitle(event.sender.id, basename(filePath));

      event.reply(IpcChannel.ProvidePassword, this._databaseService.getFilePath(event.sender.id));
    });

    ipcMain.handle(IpcChannel.EncryptPassword, async (event, password) => {
      const encryptionEvent = { type: MessageEventType.EncryptString, plain: password };
      const response = await this._encryptionProcessService.processEventAsync(encryptionEvent, this._windowService.getWindowByWebContentsId(event.sender.id).key ) as { encrypted: string };

      return response.encrypted;
    });

    ipcMain.handle(IpcChannel.DecryptPassword, async (event, password) => {
      const encryptionEvent = { type: MessageEventType.DecryptString, encrypted: password };
      const response = await this._encryptionProcessService.processEventAsync(encryptionEvent, this._windowService.getWindowByWebContentsId(event.sender.id).key) as { decrypted: string };

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
      shell.openExternal(url.includes('http') ? url : 'http://' + url);
    });

    ipcMain.once(IpcChannel.UpdateAndRelaunch, () => {
      this._updateService.updateAndRelaunch();
    });

    ipcMain.handle(IpcChannel.ValidatePassword, (_, password: string): boolean => {
      if (!password?.length) {
        return false;
      }

      return password === this._databaseService.dbPassword;
    });
  }
}

export function bootstrapApp() {
  new MainProcess();
}