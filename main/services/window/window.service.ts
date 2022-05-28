/* eslint-disable @typescript-eslint/no-var-requires */
import { app, BrowserWindow, ipcMain, IpcMainEvent, nativeImage, powerMonitor } from 'electron';
import { uptime } from 'os';
import { join } from 'path';
import { format } from 'url';
import { IpcChannel } from '../../../shared-models';
import { EventType } from '../../../src/app/core/enums';
import { ProcessArgument } from '../../process-argument.enum';
import { IConfigService } from '../config';
import { IEncryptionProcessService, Keys, MessageEventType } from '../index';
import { INativeApiService } from '../native';
import { IPerformanceService } from '../performance/performance-service.model';
import { ISendInputService } from '../send-input';
import { IWindowService } from './';

const WM_SENDICONICTHUMBNAILBITMAP = 0x0323;
const WM_DWMSENDICONICLIVEPREVIEWBITMAP = 0x0326;

export class WindowService implements IWindowService {
  private readonly _isDevMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve));
  private readonly _isTestMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.E2E));
  private readonly _windows: BrowserWindow[] = [];
  private _idleTimer: NodeJS.Timeout;

  get windows(): BrowserWindow[] {
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
      const win = this._windows.find(x => x.webContents.id === ipcEvent.sender.id);
  
      win.focus();
      win.webContents.send(IpcChannel.OpenCloseConfirmationWindow, event, payload);
    });

    ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.webContents.id === event.sender.id);
      win.close();
    });

    ipcMain.on(IpcChannel.Lock, (event: IpcMainEvent) => {
      this.onLock(event.sender.id);
    });

    ipcMain.on(IpcChannel.Unlock, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.webContents.id === event.sender.id);

      win.setOverlayIcon(null, '');
      win.unhookWindowMessage(WM_DWMSENDICONICLIVEPREVIEWBITMAP);
      win.unhookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP);
      this._nativeApiService.unsetIconicBitmap(win.getNativeWindowHandle());
    });

    ipcMain.on(IpcChannel.Minimize, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.webContents.id === event.sender.id);
      win.minimize();
    });

    ipcMain.on(IpcChannel.Maximize, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.webContents.id === event.sender.id);
      win.isMaximized() ? win.unmaximize() : win.maximize();
    });

    ipcMain.on(IpcChannel.Close, (event: IpcMainEvent) => {
      const win = this._windows.find(x => x.webContents.id === event.sender.id);
    
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      }

      win.close();
    });
  }

  getWindow(index: number): BrowserWindow {
    return this._windows[index];
  }

  getWindowByWebContentsId(id: number): BrowserWindow {
    return this._windows.find(x => x.webContents.id === id);
  }

  removeWindow(window: BrowserWindow) {
    const index = this._windows.findIndex(x => x === window);
    this._windows.splice(index, 1);
  }

  createWindow(): BrowserWindow {
    const timestamp = new Date().getTime();

    const window = new BrowserWindow({
      width: 960,
      height: 600,
      minHeight: 520,
      minWidth: 840,
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
        v8CacheOptions: 'bypassHeatCheck',
        enableWebSQL: false,
        spellcheck: false,
      },
    });

    this._isDevMode && window.webContents.openDevTools();

    window.on('maximize', () => {
      window.webContents.send('windowMaximized', true);
    });

    window.on('unmaximize', () => {
      window.webContents.send('windowMaximized', false);
    });

    this._windows.push(window);

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

  // to do: create a class which distributes events for all windows and handles the result
  registerWindowsAutotypeHandler(activeWindowTitle: string) {
    const windowsListeners = [];
    this._windows.forEach((win) => {
      const listener = async (_, channel: string, entry) => {
        if (channel === IpcChannel.AutocompleteEntry && entry) {
          const encryptionEvent = {
            type: MessageEventType.DecryptString,
            encrypted: entry.password,
            memoryKey: global['__memKey']
          };
          
          const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { decrypted: string };

          await this._sendInputService.sleep(200);
          await this._sendInputService.typeWord(entry.username);
          await this._sendInputService.pressKey(Keys.Tab);
          await this._sendInputService.typeWord(payload.decrypted);
          await this._sendInputService.pressKey(Keys.Enter);
  
          windowsListeners.forEach((l, i) => this._windows[i].webContents.off('ipc-message', l));
        }
      };

      windowsListeners.push(listener);
      win.webContents.on('ipc-message', listener);
    });

    this._windows.forEach((win) => {
      win.webContents.send(IpcChannel.GetAutotypeFoundEntry, activeWindowTitle);
    });
  }

  setIdleTimer(windowId: number) {
    clearInterval(this._idleTimer);

    this._idleTimer = setInterval(() => {
      if (powerMonitor.getSystemIdleTime() > this._configService.appConfig.idleSeconds) {
        this.windows.find(x => x.webContents.id === windowId).webContents.send(IpcChannel.Lock);
        clearInterval(this._idleTimer);
      }
    }, 1000);
  }

  private onLock(windowId: number) {
    const win = this._windows.find(x => x.webContents.id === windowId);
    const appIcon = nativeImage.createFromPath(join(global['__basedir'], 'assets', 'forbidden.png'));
    win.setOverlayIcon(appIcon, 'Database locked');

    const windowHandle = win.getNativeWindowHandle();
    this._nativeApiService.setIconicBitmap(windowHandle);
    
    const iconPath = join(app.getAppPath(), 'assets', 'icon.bmp');
    this._nativeApiService.setThumbnailBitmap(windowHandle, iconPath);

    win.hookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP, () => {
      this._nativeApiService.setThumbnailBitmap(windowHandle, iconPath);
    });

    win.hookWindowMessage(WM_DWMSENDICONICLIVEPREVIEWBITMAP, () => {
      this._nativeApiService.setLivePreviewBitmap(windowHandle, iconPath);
    });

    clearInterval(this._idleTimer);
  }
}