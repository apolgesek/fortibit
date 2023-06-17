/* eslint-disable @typescript-eslint/no-var-requires */
import { randomBytes } from 'crypto';
import { app, BrowserWindow, ipcMain, IpcMainEvent, nativeImage, nativeTheme, powerMonitor, safeStorage } from 'electron';
import { join } from 'path';
import { UrlObject } from 'url';
import { IpcChannel } from '../../../shared-models';
import { ProcessArgument } from '../../process-argument.enum';
import { IConfigService } from '../config';
import { INativeApiService } from '../native';
import { IPerformanceService } from '../performance/performance-service.model';
import { IWindowService } from './';
import { IWindow } from './window-model';

const WM_SENDICONICTHUMBNAILBITMAP = 0x0323;
const WM_DWMSENDICONICLIVEPREVIEWBITMAP = 0x0326;

const formatURL = (urlObject: UrlObject) => String(Object.assign(new URL('http://localhost'), urlObject));

export class WindowService implements IWindowService {
  private readonly _isDevMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve));
  private readonly _isTestMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.E2E));
  private readonly _windows: IWindow[] = [];
  private _idleTimer: NodeJS.Timeout;

  get windows(): IWindow[] {
    return this._windows;
  }

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IPerformanceService private readonly _performanceService: IPerformanceService,
    @INativeApiService private readonly _nativeApiService: INativeApiService,
  ) {
    ipcMain.on(IpcChannel.TryClose, (ipcEvent: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === ipcEvent.sender.id);
      win.browserWindow.focus();
    });

    ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === event.sender.id);
      win.browserWindow.close();
    });

    ipcMain.on(IpcChannel.Lock, (event: IpcMainEvent) => {
      this.onLock(event.sender.id);
    });

    ipcMain.on(IpcChannel.Unlock, (event: IpcMainEvent) => {
      this.onUnlock(event.sender.id);
    });

    ipcMain.on(IpcChannel.Minimize, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === event.sender.id);
      win.browserWindow.minimize();
    });

    ipcMain.on(IpcChannel.Maximize, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === event.sender.id);
      win.browserWindow.isMaximized() ? win.browserWindow.unmaximize() : win.browserWindow.maximize();
    });

    ipcMain.on(IpcChannel.Close, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === event.sender.id);
    
      if (win.browserWindow.webContents.isDevToolsOpened()) {
        win.browserWindow.webContents.closeDevTools();
      }

      win.browserWindow.close();
    });

    ipcMain.handle(IpcChannel.ToggleTheme, () => {
      if (nativeTheme.shouldUseDarkColors) {
        nativeTheme.themeSource = 'light';
        this._configService.set({theme: 'light'});
      } else {
        nativeTheme.themeSource = 'dark';
        this._configService.set({theme: 'dark'});
      }

      if (this._configService.appConfig.theme === 'light') {
        this.windows.forEach(w => w.browserWindow.setTitleBarOverlay({ color: '#fcfcfc', symbolColor: '#364f63' }));
      } else {
        this.windows.forEach(w => w.browserWindow.setTitleBarOverlay({ color: '#191d1e', symbolColor: '#dadada' }));
      }

      return nativeTheme.shouldUseDarkColors;
    });

    ipcMain.handle(IpcChannel.RegenerateKey, (event: IpcMainEvent) => {
      this.getWindowByWebContentsId(event.sender.id).key = this.getSecureKey();
    });
  }

  getWindow(index: number): BrowserWindow {
    return this._windows[index].browserWindow;
  }

  getWindowByWebContentsId(id: number): IWindow {
    return this._windows.find(x => x.browserWindow.webContents.id === id);
  }

  removeWindow(window: BrowserWindow) {
    const index = this._windows.findIndex(x => x.browserWindow === window);
    this._windows.splice(index, 1);
  }

  createMainWindow(): BrowserWindow {
    const window = this.createFromTemplate({
      width: 960,
      height: 600,
      minHeight: 520,
      minWidth: 800,
      resizable: true,
      title: this._configService.appConfig.name,
    });

    window.once('closed', () => {
      this.removeWindow(window);
      if (this.windows.length === 1) {
        this.getWindow(0).close();
      }
    })

    window.on('maximize', () => {
      window.webContents.send(IpcChannel.MaximizedRestored, true);
    });

    window.on('unmaximize', () => {
      window.webContents.send(IpcChannel.MaximizedRestored, false);
    });

    this._windows.push({ browserWindow: window, key: null });

    // log performance only for the first window when the app initializes
    if (window.id === 1) {
      window.webContents.on('dom-ready', () => {
        this._performanceService.mark('domReady');
      });
    }

    window.webContents.setFrameRate(60);

    return window;
  }

  createEntrySelectWindow(): BrowserWindow {
    const window = this.createFromTemplate({
      width: 600,
      height: 400,
      minWidth: 600,
      resizable: false,
      title: this._configService.appConfig.name + '- entry select',
      show: false
    });

    window.on('close', (event) => {
      if (this.windows.length > 1) {
        event.preventDefault();
        window.blur();
        window.hide();
      } else {
        window.destroy();
      }
    });

    window.once('closed', () => {
      this.removeWindow(window);
    })

    this._windows.push({ browserWindow: window, key: null });
    return window;
  }

  async loadWindow(windowRef: BrowserWindow, path?: string) {
    let url = '';

    if (this._isDevMode) {
      require('electron-reloader')(module, { ignore: /.*\.json$/ });
      url = formatURL({
        protocol: 'http:',
        host: 'localhost',
        port: 4200,
        hash: path ?? ''
      });
    } else {
      url = formatURL({
        protocol: 'file:',
        href: join(global['__basedir'], this._isTestMode ? 'dist' : 'renderer', 'index.html'),
        hash: path ?? ''
      });
    }

    return windowRef.loadURL(url);
  }

  setIdleTimer() {
    if (this._idleTimer) {
      return;
    }

    this._idleTimer = setInterval(() => {
      if (powerMonitor.getSystemIdleTime() > this._configService.appConfig.idleSeconds) {
        this._windows.forEach(window => {
          window.browserWindow.webContents.send(IpcChannel.Lock);
        });
      }
    }, 1000);
  }

  setTitle(windowId: number, title: string): void {
    this.windows.find(x => x.browserWindow.id === windowId).browserWindow.setTitle(`${title} - Fortibit`);
  }

  getSecureKey(): string {
    const key = randomBytes(32).toString('base64');
    return safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key).toString('base64') : key;
  }

  private onLock(windowId: number) {
    const win = this.getWindowByWebContentsId(windowId);
    win.key = null;

    if (process.platform === 'win32') {
      this.disablePreviewFeatures(win);
    }

    if (this._idleTimer) {
      clearInterval(this._idleTimer);
      this._idleTimer = null;
    }
  }

  private onUnlock(windowId: number) {
    const win = this.getWindowByWebContentsId(windowId);

    if (process.platform === 'win32') {
      this.enablePreviewFeatures(win);
    }
  }

  private enablePreviewFeatures(win: IWindow): void {
    win.browserWindow.setOverlayIcon(null, '');
    win.browserWindow.unhookWindowMessage(WM_DWMSENDICONICLIVEPREVIEWBITMAP);
    win.browserWindow.unhookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP);
    this._nativeApiService.unsetIconicBitmap(win.browserWindow.getNativeWindowHandle());
  }

  private disablePreviewFeatures(win: IWindow): void {
    const appIcon = nativeImage.createFromPath(join(global['__basedir'], 'assets', 'forbidden.png'));
    win.browserWindow.setOverlayIcon(appIcon, 'Database locked');

    const windowHandle = win.browserWindow.getNativeWindowHandle();
    this._nativeApiService.setIconicBitmap(windowHandle);
    
    const iconPath = join(app.getAppPath(), 'assets', 'icon.bmp');
    this._nativeApiService.setThumbnailBitmap(windowHandle, iconPath);

    win.browserWindow.hookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP, () => {
      this._nativeApiService.setThumbnailBitmap(windowHandle, iconPath);
    });

    win.browserWindow.hookWindowMessage(WM_DWMSENDICONICLIVEPREVIEWBITMAP, () => {
      this._nativeApiService.setLivePreviewBitmap(windowHandle, iconPath);
    });
  }

  private createFromTemplate(options: Omit<Electron.BrowserWindowConstructorOptions, 'webPreferences'>): BrowserWindow {
    const template: Electron.BrowserWindowConstructorOptions = {
      frame: false,
      backgroundColor: this._configService.appConfig.theme === 'light' ? '#fcfcfc' : '#191d1e',
      // shouldn't be changed for best security
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        nodeIntegrationInSubFrames: false,
        nodeIntegrationInWorker: false,
        preload: join(global['__basedir'], this._isTestMode ? 'dist' : 'renderer', 'preload.js'),
        webSecurity: !this._isDevMode,
        devTools: this._isDevMode,
        backgroundThrottling: false,
        v8CacheOptions: 'code',
        enableWebSQL: false,
        spellcheck: false,
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: this._configService.appConfig.theme === 'light' ? '#fcfcfc' : '#191d1e',
        symbolColor: this._configService.appConfig.theme === 'light' ? '#191d1e' : '#fcfcfc',
        height: 32,
      }
    };
    const window = new BrowserWindow({ ...options, ...template });

    window.webContents.on('will-navigate', (e) => {
      e.preventDefault();
    });

    return window;
  }
}