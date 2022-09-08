/* eslint-disable @typescript-eslint/no-var-requires */
import { randomBytes } from 'crypto';
import { app, BrowserWindow, ipcMain, IpcMainEvent, nativeImage, powerMonitor, safeStorage } from 'electron';
import { join } from 'path';
import { format } from 'url';
import { IpcChannel } from '../../../shared-models';
import { EventType } from '../../../src/app/core/enums';
import { ProcessArgument } from '../../process-argument.enum';
import { IConfigService } from '../config';
import { IEncryptionProcessService, MessageEventType } from '../encryption';
import { INativeApiService } from '../native';
import { IPerformanceService } from '../performance/performance-service.model';
import { ISendInputService, KeyCode } from '../send-input';
import { IWindowService } from './';
import { IWindow } from './window-model';

const WM_SENDICONICTHUMBNAILBITMAP = 0x0323;
const WM_DWMSENDICONICLIVEPREVIEWBITMAP = 0x0326;

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
    @IEncryptionProcessService private readonly _encryptionProcessService: IEncryptionProcessService,
    @IPerformanceService private readonly _performanceService: IPerformanceService,
    @ISendInputService private readonly _sendInputService: ISendInputService,
    @INativeApiService private readonly _nativeApiService: INativeApiService
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

  createWindow(): BrowserWindow {
    const timestamp = new Date().getTime();

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
        partition: `persist:${timestamp}`,
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

    window.on('maximize', () => {
      window.webContents.send('windowMaximized', true);
    });

    window.on('unmaximize', () => {
      window.webContents.send('windowMaximized', false);
    });

    // generate random key to be used for in memory encryption of db entries
    const key = randomBytes(32).toString('base64');
    const secureKey = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key).toString('base64') : key;

    this._windows.push({ browserWindow: window, key: secureKey });

    // log performance only for the first window when the app initializes
    if (window.id === 1) {
      window.webContents.on('dom-ready', () => {
        this._performanceService.mark('domReady');
      });
    }

    return window;
  }

  async loadWindow(windowRef: BrowserWindow) {
    let loadedWindow: Promise<void> | undefined;

    if (this._isDevMode) {
      require('electron-reload')(global['__basedir'], {
        electron: require(`${global['__basedir']}/node_modules/electron`)
      });

      loadedWindow = windowRef.loadURL('http://localhost:4200');
    } else {
      const directory = this._isTestMode ? 'dist' : 'src';

      loadedWindow = windowRef.loadURL(format({
        pathname: join(global['__basedir'], directory, 'index.html'),
        protocol: 'file:',
        slashes: true
      }));
    }

    return loadedWindow;
  }

  // TODO: create a class which distributes events for all windows and handles the result
  registerAutotypeHandler(activeWindowTitle: string) {
    const windowsListeners = [];
    this._windows.forEach((win) => {
      const listener = async (_, channel: string, entry) => {
        if (channel === IpcChannel.AutocompleteEntry && entry) {
          const encryptionEvent = {
            type: MessageEventType.DecryptString,
            encrypted: entry.password,
            memoryKey: win.key
          };
          
          const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent, win.key) as { decrypted: string };

          await this._sendInputService.sleep(200);

          if (entry.username) {
            await this._sendInputService.typeWord(entry.username);
            await this._sendInputService.pressKey(KeyCode.TAB);
          }

          await this._sendInputService.typeWord(payload.decrypted);
          await this._sendInputService.pressKey(KeyCode.ENTER);
  
          windowsListeners.forEach((l, i) => this._windows[i].browserWindow.webContents.off('ipc-message', l));
        }
      };

      windowsListeners.push(listener);
      win.browserWindow.webContents.on('ipc-message', listener);
    });

    this._windows.forEach((win) => {
      win.browserWindow.webContents.send(IpcChannel.GetAutotypeFoundEntry, activeWindowTitle);
    });
  }

  setIdleTimer(windowId: number) {
    clearInterval(this._idleTimer);

    this._idleTimer = setInterval(() => {
      if (powerMonitor.getSystemIdleTime() > this._configService.appConfig.idleSeconds) {
        this.windows.find(x => x.browserWindow.webContents.id === windowId).browserWindow.webContents.send(IpcChannel.Lock);
        clearInterval(this._idleTimer);
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

    clearInterval(this._idleTimer);
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
}