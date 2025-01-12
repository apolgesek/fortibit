/* eslint-disable @typescript-eslint/no-var-requires */
import { Configuration } from '@root/configuration';
import { IMessageBroker } from '@root/main/ipc/message-broker';
import { IConfigService } from '@root/main/services/config';
import { INativeApiService } from '@root/main/services/native';
import { IPerformanceService } from '@root/main/services/performance';
import { IpcChannel } from '@shared-renderer/index';
import { randomBytes } from 'crypto';
import {
	app,
	BrowserWindow,
	nativeImage,
	nativeTheme,
	powerMonitor,
	safeStorage,
	screen,
} from 'electron';
import { join } from 'path';
import { nextTick } from 'process';
import { UrlObject } from 'url';
import { ProcessArgument } from '../../process-argument.enum';
import { IWindow, IWindowService } from './';

const WM_SENDICONICTHUMBNAILBITMAP = 0x0323;
const WM_DWMSENDICONICLIVEPREVIEWBITMAP = 0x0326;

const formatURL = (urlObject: UrlObject) =>
	String(Object.assign(new URL('http://localhost'), urlObject));

export class WindowService implements IWindowService {
	private readonly _isDevMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.Serve),
	);
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);
	private readonly _windows: IWindow[] = [];
	private _idleTimer: NodeJS.Timeout | null;

	get windows(): IWindow[] {
		return this._windows;
	}

	get vaultWindows(): IWindow[] {
		return this.windows.filter(
			(x) => x.browserWindow.id !== this.getWindow(1)?.id,
		);
	}

	constructor(
		@IMessageBroker private readonly _messageBroker: IMessageBroker,
		@IConfigService private readonly _configService: IConfigService,
		@IPerformanceService
		private readonly _performanceService: IPerformanceService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {}

	getWindow(index: number): BrowserWindow | undefined {
		return this._windows[index]?.browserWindow;
	}

	getWindowByWebContentsId(id: number): IWindow {
		const window = this._windows.find(
			(x) => x.browserWindow.webContents.id === id,
		);

		if (!window) throw new Error(`Window not found by webContents id ${id}`);

		return window;
	}

	removeWindow(window: BrowserWindow) {
		const index = this._windows.findIndex((x) => x.browserWindow === window);
		this._windows.splice(index, 1);
	}

	/* eslint-disable @typescript-eslint/no-explicit-any */
	sendMessage(window: BrowserWindow, channel: IpcChannel, ...args: any[]): void;
	sendMessage(windowId: number, channel: IpcChannel, ...args: any[]): void;
	sendMessage(
		windowOrWindowId: BrowserWindow | number,
		channel: IpcChannel,
		...args: any[]
	): void {
		let window: BrowserWindow | undefined;
		if (typeof windowOrWindowId === 'number') {
			window = this.getWindowByWebContentsId(windowOrWindowId)?.browserWindow;
		} else {
			window = windowOrWindowId;
		}

		this._messageBroker.send(window, channel, ...args);
	}

	sendMessageToAll(channel: IpcChannel, ...args: any[]): void {
		this.vaultWindows.forEach((w) =>
			this._messageBroker.send(w.browserWindow, channel, ...args),
		);
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	createMainWindow(): BrowserWindow {
		screen.on('display-metrics-changed', () => {
			this.windows.forEach((w) =>
				this.sendMessage(w.browserWindow, IpcChannel.RecalculateViewport),
			);
		});

		const window = this.createFromTemplate({
			width: 860,
			height: 580,
			minHeight: 300,
			minWidth: 720,
			resizable: true,
			title: this._configService.appConfig.name,
		});

		window.once('closed', () => {
			this.removeWindow(window);
			if (this.windows.length === 1) {
				this.getWindow(0)?.close();
			}
		});

		this._windows.push({ browserWindow: window, key: null });

		window.webContents.once('dom-ready', () => {
			if (this._isDevMode) {
				window.webContents.openDevTools({ mode: 'detach' });
			}

			this._performanceService.mark('domReady');
		});

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
			show: false,
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
		});

		if (this._isDevMode) {
			window.webContents.once('dom-ready', () => {
				window.webContents.openDevTools({ mode: 'detach' });
			});
		}

		this._windows.push({ browserWindow: window, key: null });
		return window;
	}

	async loadWindow(windowRef: BrowserWindow, path?: string) {
		let url = '';

		if (this._isDevMode) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			require('electron-reloader')(module, { ignore: [/.*\.json$/] });
			url = formatURL({
				protocol: 'http:',
				host: 'localhost',
				port: 4200,
				hash: path ?? '',
			});
		} else {
			url = formatURL({
				protocol: 'file:',
				href: join(
					global['__basedir'],
					this._isTestMode ? 'dist' : 'renderer',
					'index.html',
				),
				hash: path ?? '',
			});
		}

		return windowRef.loadURL(url);
	}

	setIdleTimer() {
		if (this._idleTimer) {
			return;
		}

		this._idleTimer = setInterval(() => {
			if (
				powerMonitor.getSystemIdleTime() >
				this._configService.appConfig.idleSeconds
			) {
				this.vaultWindows.forEach((window) => {
					this.sendMessage(window.browserWindow, IpcChannel.Lock);
				});
			}
		}, 1_000);
	}

	setTitle(windowId: number, title: string): void {
		this.windows
			.find((x) => x.browserWindow.id === windowId)
			?.browserWindow.setTitle(`${title} - Fortibit`);
	}

	getSecureKey(): string {
		const key = randomBytes(32).toString('base64');
		return safeStorage.isEncryptionAvailable()
			? safeStorage.encryptString(key).toString('base64')
			: key;
	}

	getThumbnailIconPath(): string {
		return join(
			app.getAppPath(),
			'assets',
			`icon-${this._configService.appConfig.theme}.bmp`,
		);
	}

	onLock(windowId: number): void {
		const win = this.getWindowByWebContentsId(windowId);

		if (this.getWindow(1)?.isVisible()) {
			this.getWindow(1)?.hide();
		}

		win.key = null;

		if (process.platform === 'win32') {
			this.disablePreviewFeatures(win);
		}

		if (this._idleTimer) {
			clearInterval(this._idleTimer);
			this._idleTimer = null;
		}
	}

	onUnlock(windowId: number): void {
		const win = this.getWindowByWebContentsId(windowId);

		if (process.platform === 'win32') {
			this.enablePreviewFeatures(win);
		}
	}

	private enablePreviewFeatures(win: IWindow): void {
		if (win?.browserWindow?.isDestroyed()) {
			return;
		}

		win.browserWindow.setOverlayIcon(null, '');
		win.browserWindow.unhookWindowMessage(WM_DWMSENDICONICLIVEPREVIEWBITMAP);
		win.browserWindow.unhookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP);
		this._nativeApiService.unsetIconicBitmap(
			win.browserWindow.getNativeWindowHandle(),
		);
	}

	private disablePreviewFeatures(win: IWindow): void {
		if (win?.browserWindow?.isDestroyed()) {
			return;
		}

		const appIcon = nativeImage.createFromPath(
			join(global['__basedir'], 'assets', 'forbidden.png'),
		);
		win.browserWindow.setOverlayIcon(appIcon, 'Database locked');

		const windowHandle = win.browserWindow.getNativeWindowHandle();
		this._nativeApiService.setIconicBitmap(windowHandle);

		this._nativeApiService.setThumbnailBitmap(
			windowHandle,
			this.getThumbnailIconPath(),
			this._configService.appConfig.theme,
		);

		win.browserWindow.hookWindowMessage(WM_SENDICONICTHUMBNAILBITMAP, () => {
			this._nativeApiService.setThumbnailBitmap(
				windowHandle,
				this.getThumbnailIconPath(),
				this._configService.appConfig.theme,
			);
		});

		win.browserWindow.hookWindowMessage(
			WM_DWMSENDICONICLIVEPREVIEWBITMAP,
			() => {
				this._nativeApiService.setLivePreviewBitmap(
					windowHandle,
					this.getThumbnailIconPath(),
					this._configService.appConfig.theme,
				);
			},
		);
	}

	toggleTheme(config: Configuration): void {
		if (this._configService.appConfig.theme === config.theme) return;

		if (config.theme === 'dark') {
			nativeTheme.themeSource = 'dark';

			this.windows.forEach((w) =>
				w.browserWindow.setTitleBarOverlay({
					color: '#191d1e',
					symbolColor: '#dadada',
				}),
			);
		} else {
			nativeTheme.themeSource = 'light';

			this.windows.forEach((w) =>
				w.browserWindow.setTitleBarOverlay({
					color: '#fcfcfc',
					symbolColor: '#364f63',
				}),
			);
		}

		this.windows.forEach((w) => {
			if (w.key == null) {
				this._nativeApiService.setThumbnailBitmap(
					w.browserWindow.getNativeWindowHandle(),
					this.getThumbnailIconPath(),
					this._configService.appConfig.theme,
				);
			}
		});
	}

	private createFromTemplate(
		options: Omit<Electron.BrowserWindowConstructorOptions, 'webPreferences'>,
	): BrowserWindow {
		const template: Electron.BrowserWindowConstructorOptions = {
			frame: false,
			backgroundColor:
				this._configService.appConfig.theme === 'light' ? '#fcfcfc' : '#191d1e',
			// shouldn't be changed for best security
			webPreferences: {
				sandbox: false,
				nodeIntegration: false,
				contextIsolation: true,
				nodeIntegrationInSubFrames: false,
				nodeIntegrationInWorker: false,
				preload: join(
					global['__basedir'],
					this._isTestMode ? 'dist' : 'renderer',
					'preload.js',
				),
				webSecurity: !this._isDevMode,
				devTools: this._isDevMode,
				backgroundThrottling: false,
				v8CacheOptions: 'code',
				enableWebSQL: false,
				spellcheck: false,
				textAreasAreResizable: false,
			},
			titleBarStyle: 'hidden',
			titleBarOverlay: {
				color:
					this._configService.appConfig.theme === 'light'
						? '#fcfcfc'
						: '#191d1e',
				symbolColor:
					this._configService.appConfig.theme === 'light'
						? '#191d1e'
						: '#fcfcfc',
				height: 32,
			},
		};
		const window = new BrowserWindow({ ...options, ...template });

		window.on('move', () => {
			this.sendMessage(window, IpcChannel.RecalculateViewport);
		});

		window.on('restore', () => {
			nextTick(() => {
				this.sendMessage(window, IpcChannel.RecalculateViewport);
			});
		});

		window.webContents.on('will-navigate', (e) => {
			e.preventDefault();
		});

		if (this._configService.appConfig.protectWindowsFromCapture) {
			this._nativeApiService.setWindowAffinity(
				window.getNativeWindowHandle(),
				true,
			);
		}

		return window;
	}
}
