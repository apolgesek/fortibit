/* eslint-disable @typescript-eslint/no-var-requires */
import { randomBytes } from 'crypto';
import { app, BrowserWindow, ipcMain, IpcMainEvent, nativeImage, powerMonitor, safeStorage } from 'electron';
import { join } from 'path';
import { UrlObject } from 'url';
import { EventType } from '../../../renderer/app/core/enums';
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
    ipcMain.on(IpcChannel.TryClose, (ipcEvent: IpcMainEvent, event?: EventType, payload?: unknown) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === ipcEvent.sender.id);
  
      win.browserWindow.focus();
      win.browserWindow.webContents.send(IpcChannel.OpenCloseConfirmationWindow, event, payload);
    });

    ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === event.sender.id);
      win.browserWindow.close();
    });

    ipcMain.on(IpcChannel.Lock, (event: IpcMainEvent) => {
      this.onLock(event.sender.id);
    });

    ipcMain.on(IpcChannel.Unlock, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.browserWindow.webContents.id === event.sender.id);

      if (process.platform === 'win32') {
        this.enablePreviewFeatures(win);
      }
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
    const window = new BrowserWindow({
      width: 960,
      height: 600,
      minHeight: 520,
      minWidth: 800,
      resizable: true,
      title: this._configService.appConfig.name,
      backgroundColor: '#fff',
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: this._isDevMode,
        backgroundThrottling: false,
        v8CacheOptions: 'code',
        enableWebSQL: false,
        spellcheck: false,
        webgl: false,
        webSecurity: !this._isDevMode
      },
    });

    if (this._isDevMode) {
      window.webContents.openDevTools({ mode: 'detach' });
    }

    window.webContents.on('will-navigate', (e) => {
      e.preventDefault();
    });

    window.once('closed', () => {
      this.removeWindow(window);
      if (this.windows.length === 1) {
        this.getWindow(0).close();
      }
    })

    window.on('maximize', () => {
      window.webContents.send('windowMaximized', true);
    });

    window.on('unmaximize', () => {
      window.webContents.send('windowMaximized', false);
    });

    this._windows.push({ browserWindow: window, key: this.getRandomSecureKey() });

    // log performance only for the first window when the app initializes
    if (window.id === 1) {
      window.webContents.on('dom-ready', () => {
        this._performanceService.mark('domReady');
      });
    }

    return window;
  }

  createEntrySelectWindow(): BrowserWindow {
    const window = new BrowserWindow({
      width: 600,
      height: 400,
      resizable: false,
      title: this._configService.appConfig.name + '- entry select',
      backgroundColor: '#fff',
      frame: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: false,
        backgroundThrottling: false,
        v8CacheOptions: 'code',
        enableWebSQL: false,
        spellcheck: false,
        webgl: false,
        webSecurity: !this._isDevMode
      },
    });

    window.webContents.on('will-navigate', (e) => {
      e.preventDefault();
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

    this._windows.push({ browserWindow: window, key: this.getRandomSecureKey() });
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

  private onLock(windowId: number) {
    if (process.platform === 'win32') {
      this.disablePreviewFeatures(windowId);
    }

    if (this._idleTimer) {
      clearInterval(this._idleTimer);
      this._idleTimer = null;
    }
  }

  private enablePreviewFeatures(win: IWindow): void {
    win.browserWindow.setOverlayIcon(null, '');
    win.browserWindow.unhookWindowMessage(WM_DWMSENDICONICLIVEPREVIEWBITMAP);
    win.browserWindow.unhookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP);
    this._nativeApiService.unsetIconicBitmap(win.browserWindow.getNativeWindowHandle());
  }

  private disablePreviewFeatures(windowId: number): void {
    const win = this._windows.find(x => x.browserWindow.webContents.id === windowId);
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

  private getRandomSecureKey(): string {
    const key = randomBytes(32).toString('base64');
    return safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key).toString('base64') : key;
  }
}