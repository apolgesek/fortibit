/* eslint-disable @typescript-eslint/no-var-requires */

import { randomBytes } from 'crypto';
import { app, globalShortcut, ipcMain, safeStorage, shell } from 'electron';
import { IpcMainEvent, IpcMainInvokeEvent } from 'electron/main';
import { IpcChannel } from '../shared-models';
import { SingleInstanceServices } from './dependency-injection';
import { ProcessArgument } from './process-argument.enum';
import { IEncryptionProcessService, INativeApiService, IUpdateService, IWindowService, MessageEventType } from './services';
import { IConfigService } from './services/config';
import { IDatabaseService } from './services/file/database-service.model';
import { IPerformanceService } from './services/performance/performance-service.model';

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

  constructor() {
    this._services = new SingleInstanceServices();
    this._fileArg = process.argv.find(x => x.endsWith(this._services.get(IConfigService).appConfig.fileExtension));
  
    this.registerAppEvents();
  }

  private registerAppEvents() {
    app.on('second-instance', (_, argv) => {
      const windowRef = this._windowService.createWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve)));
      const windowLoaded = this._windowService.loadWindow(windowRef);

      windowLoaded.then(() => {
        this._updateService.checkForUpdates();
      });

      const filePath = argv.find(x => x.endsWith(this._configService.appConfig.fileExtension));

      if (filePath) {
        this._databaseService.setFilePath(windowRef.webContents.id, filePath);
      }

      windowRef.once('closed', () => {
        this._windowService.removeWindow(windowRef);
      });
    });

    app.once('ready', () => this.onReady());

    app.once('window-all-closed', () => {
      globalShortcut.unregisterAll();
      app.quit();
    });
  }

  private onReady() {
    const key = randomBytes(8).toString('hex');
    global['__memKey'] = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key) : key;

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

      event.reply(IpcChannel.ProvidePassword, this._databaseService.getFilePath(event.sender.id));
    });

    ipcMain.handle(IpcChannel.EncryptPassword, async (_, password) => {
      const encryptionEvent = { type: MessageEventType.EncryptString, plain: password };
      const response = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { encrypted: string };

      return response.encrypted;
    });

    ipcMain.handle(IpcChannel.DecryptPassword, async (_, password) => {
      const encryptionEvent = { type: MessageEventType.DecryptString, encrypted: password };
      const response = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { decrypted: string };

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