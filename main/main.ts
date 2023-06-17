/* eslint-disable @typescript-eslint/no-var-requires */

import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeTheme, shell } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { basename } from 'path';
import { IpcChannel } from '../shared-models';
import { SingleInstanceServices } from './dependency-injection';
import { ProcessArgument } from './process-argument.enum';
import { IAutotypeService } from './services/autotype';
import { IConfigService } from './services/config';
import { IDatabaseService } from './services/database';
import { IEncryptionEventWrapper, MessageEventType } from './services/encryption';
import { IPerformanceService } from './services/performance/performance-service.model';
import { IWindowService } from './services/window';
import { IClipboardService } from './services/clipboard';

class MainProcess {
  private readonly _services: SingleInstanceServices;
  private readonly _isDevMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve));

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

  private get _performanceService(): IPerformanceService {
    return this._services.get(IPerformanceService);
  }

  private get _configService(): IConfigService {
    return this._services.get(IConfigService);
  }

  private get _autotypeService(): IAutotypeService {
    return this._services.get(IAutotypeService);
  }

  private get _clipboardService(): IClipboardService {
    return this._services.get(IClipboardService);
  }

  constructor() {
    this._services = new SingleInstanceServices();
    this._fileArg = process.argv.find(x => x.endsWith(this._services.get(IConfigService).appConfig.fileExtension));
  
    // https://www.electronjs.org/docs/latest/tutorial/performance#8-call-menusetapplicationmenunull-when-you-do-not-need-a-default-menu
    Menu.setApplicationMenu(null);
    this.registerAppEvents();
  }

  private registerAppEvents() {
    app.on('second-instance', (event: Electron.Event, argv) => {
      const windowRef = this._windowService.createMainWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve)));
      const filePath = argv.find(x => x.endsWith(this._configService.appConfig.fileExtension));
      this.setFile(windowRef, filePath);

      this._windowService.loadWindow(windowRef);
    });

    // disable creation of new windows for better security
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    });

    app.on('open-file', (event, path) => {
      event.preventDefault();
      this._fileArg = path;
    });

    app.once('ready', () => this.onReady());

    // exit listeners
    app.once('window-all-closed', () => {
      this.exitApp();
    });

    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(event => {
      process.once(event, () => this.exitApp());
    });
  }

  private exitApp() {
    globalShortcut.unregisterAll();
    this._databaseService.onAppExit();
    this._clipboardService.clear();

    app.exit();
  }

  private async onReady() {
    const mainWindow = this._windowService.createMainWindow(Boolean(app.commandLine.hasSwitch(ProcessArgument.PerfLog)));
    const entrySelectWindow = this._windowService.createEntrySelectWindow();
    this.registerIpcEventListeners();

    if (this._configService.appConfig.theme === 'dark') {
      nativeTheme.themeSource = 'dark';
    } else if (this._configService.appConfig.theme === 'light') {
      nativeTheme.themeSource = 'light';
    }

    if (this._configService.appConfig.autoTypeEnabled) {
      this._autotypeService.registerAutocompleteShortcut();
    }

    this.setFile(mainWindow, this._fileArg);
    await this._windowService.loadWindow(mainWindow);

    try {
      this._performanceService.mark('firstWindowLoaded');
    } catch (err) {
      console.log(err);
    }

    this.openDevTools(mainWindow);

    await this._windowService.loadWindow(entrySelectWindow, 'entry-select');
    this.openDevTools(entrySelectWindow);
  }

  private openDevTools(window: BrowserWindow) {
    if (this._isDevMode) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  }

  private setFile(windowRef: BrowserWindow, filePath: string) {
    if (filePath) {
      this._databaseService.setDatabaseEntry(windowRef.webContents.id, filePath);
      this._windowService.setTitle(windowRef.id, basename(filePath));
    } else {
      if (!existsSync(this._configService.workspacesPath)) {
        writeFileSync(this._configService.workspacesPath, '{"recentlyOpened": [], "workspace": null}', { encoding: 'utf8' });
      }

      const workspace = readFileSync(this._configService.workspacesPath, 'utf8');
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

    ipcMain.on(IpcChannel.OpenUrl, async (_, url: string) => {
      if (!/^https?/.test(url)) {
        url = 'http://' + url;
      }

      shell.openExternal(url);
    });
  }
}

export function bootstrapApp() {
  new MainProcess();
}