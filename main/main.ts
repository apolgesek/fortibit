import { IpcChannel } from '@shared-renderer/index';
import {
	app,
	BrowserWindow,
	desktopCapturer,
	dialog,
	globalShortcut,
	ipcMain,
	Menu,
	nativeTheme,
	screen,
	shell,
} from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { basename, join } from 'path';
import { SingleInstanceServices } from './di';
import { ProcessArgument } from './process-argument.enum';
import { IAutotypeService } from './services/autotype';
import { IClipboardService } from './services/clipboard';
import { IConfigService } from './services/config';
import { IDatabaseService } from './services/database';
import {
	IEncryptionEventWrapper,
	MessageEventType,
} from './services/encryption';
import { IPerformanceService } from './services/performance/performance-service.model';
import { IWindowService } from './services/window';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { getDateString } from './util';
import { IDatabaseIpcEventHandler } from './ipc/database-ipc-event-handler';
import { IWindowIpcEventHandler } from './ipc/window-ipc-event-handler';
import {
	IAutotypeIpcEventHandler,
	IClipboardIpcEventHandler,
	IConfigIpcEventHandler,
	IExportIpcEventHandler,
	IIconIpcEventHandler,
	IImportIpcEventHandler,
	IIpcEventHandler,
	IUpdateIpcEventHandler,
} from './ipc';

class MainProcess {
	private readonly _services: SingleInstanceServices;
	private readonly _isDevMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.Serve),
	);
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);

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

	private get _databaseIpcEventHandler() {
		return this._services.get(IDatabaseIpcEventHandler);
	}

	private get _windowIpcEventHandler() {
		return this._services.get(IWindowIpcEventHandler);
	}

	private get _iconIpcEventHandler() {
		return this._services.get(IIconIpcEventHandler);
	}

	private get _configIpcEventHandler() {
		return this._services.get(IConfigIpcEventHandler);
	}

	private get _autotypeIpcEventHandler() {
		return this._services.get(IAutotypeIpcEventHandler);
	}

	private get _importIpcEventHandler() {
		return this._services.get(IImportIpcEventHandler);
	}

	private get _exportIpcEventHandler() {
		return this._services.get(IExportIpcEventHandler);
	}

	private get _updateIpcEventHandler() {
		return this._services.get(IUpdateIpcEventHandler);
	}

	private get _clipboardIpcEventHandler() {
		return this._services.get(IClipboardIpcEventHandler);
	}

	constructor() {
		process.env.TEST_MODE = this._isTestMode ? '1' : '0';
		this._services = new SingleInstanceServices();
		this._fileArg = process.argv.find((x) =>
			x.endsWith(this._services.get(IConfigService).appConfig.fileExtension),
		);

		// https://www.electronjs.org/docs/latest/tutorial/performance#8-call-menusetapplicationmenunull-when-you-do-not-need-a-default-menu
		Menu.setApplicationMenu(null);
		this.registerAppEvents();
	}

	private registerAppEvents() {
		app.on('second-instance', (_: Electron.Event, argv) => {
			const filePath = argv.find((x) =>
				x.endsWith(this._configService.appConfig.fileExtension),
			);

			const isAlreadyOpenFile = Array.from(
				this._databaseService.fileMap.values(),
			).find((x) => x.file === filePath);
			if (isAlreadyOpenFile) {
				return;
			}

			const windowRef = this._windowService.createMainWindow();
			this.setFile(windowRef, filePath);

			this._windowService.loadWindow(windowRef, null);
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

		['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((event) => {
			process.once(event, () => this.exitApp());
		});

		process.on('unhandledRejection', (reason) => {
			console.log('Unhandled promise rejection: ', reason);
		});
	}

	private exitApp() {
		globalShortcut.unregisterAll();
		this._databaseService.onAppExit();
		this._clipboardService.clear();

		app.exit();
	}

	private async onReady() {
		this.registerIpcEventListeners();

		const mainWindow = this._windowService.createMainWindow();
		this.setFile(mainWindow, this._fileArg);

		this._windowService.loadWindow(mainWindow, null).then(() => {
			const entrySelectWindow = this._windowService.createEntrySelectWindow();
			this._windowService.loadWindow(entrySelectWindow, 'entry-select');
		});

		if (this._configService.appConfig.theme === 'dark') {
			nativeTheme.themeSource = 'dark';
		} else if (this._configService.appConfig.theme === 'light') {
			nativeTheme.themeSource = 'light';
		}

		if (this._configService.appConfig.autoTypeEnabled) {
			this._autotypeService.registerAutocompleteShortcut(
				this._configService.appConfig.autocompleteShortcut,
				this._configService.appConfig.autocompleteUsernameOnlyShortcut,
				this._configService.appConfig.autocompletePasswordOnlyShortcut,
			);
		}

		try {
			this._performanceService.mark('firstWindowLoaded');
		} catch (err) {
			console.log(err);
		}
	}

	private setFile(windowRef: BrowserWindow, filePath: string) {
		if (filePath) {
			this._databaseService.setDatabaseEntry(
				windowRef.webContents.id,
				filePath,
			);
			this._windowService.setTitle(windowRef.id, basename(filePath));
		} else {
			if (!existsSync(this._configService.workspacesPath)) {
				writeFileSync(
					this._configService.workspacesPath,
					'{"recentlyOpened": [], "workspace": null}',
					{ encoding: 'utf8' },
				);
			}

			const workspace = readFileSync(
				this._configService.workspacesPath,
				'utf8',
			);
			const path = JSON.parse(workspace);

			if (path.workspace && existsSync(path.workspace)) {
				this._databaseService.setDatabaseEntry(
					windowRef.webContents.id,
					path.workspace,
				);
				this._windowService.setTitle(windowRef.id, basename(path.workspace));
			}
		}
	}

	private registerIpcEventListeners() {
		const ipcEventHandlers: IIpcEventHandler[] = [
			this._configIpcEventHandler,
			this._databaseIpcEventHandler,
			this._windowIpcEventHandler,
			this._iconIpcEventHandler,
			this._autotypeIpcEventHandler,
			this._importIpcEventHandler,
			this._exportIpcEventHandler,
			this._updateIpcEventHandler,
			this._clipboardIpcEventHandler,
		];

		ipcEventHandlers.forEach((handler) => handler.initialize());

		ipcMain.handle(IpcChannel.GetWhitelistedChannels, () => {
			return Object.values(IpcChannel);
		});

		ipcMain.handle(IpcChannel.GetPlatformInfo, () => {
			return platform();
		});

		ipcMain.handle(IpcChannel.EncryptPassword, async (event, password) => {
			const encryptionEvent = {
				type: MessageEventType.EncryptString,
				plain: password,
			};
			const response = (await this._encryptionEventWrapper.processEventAsync(
				encryptionEvent,
				this._windowService.getWindowByWebContentsId(event.sender.id).key,
			)) as { encrypted: string };

			return response.encrypted;
		});

		ipcMain.handle(IpcChannel.DecryptPassword, async (event, password) => {
			const encryptionEvent = {
				type: MessageEventType.DecryptString,
				encrypted: password,
			};
			const response = (await this._encryptionEventWrapper.processEventAsync(
				encryptionEvent,
				this._windowService.getWindowByWebContentsId(event.sender.id).key,
			)) as { decrypted: string };

			return response.decrypted;
		});

		ipcMain.on(IpcChannel.OpenUrl, async (_, url: string) => {
			if (!/^https?/.test(url)) {
				url = 'http://' + url;
			}

			shell.openExternal(url);
		});

		ipcMain.handle(IpcChannel.ScanQrCode, async (event) => {
			const window = this._windowService.getWindowByWebContentsId(
				event.sender.id,
			).browserWindow;

			const { width, height } = screen.getPrimaryDisplay().size;
			const sources = await desktopCapturer.getSources({
				types: ['window'],
				thumbnailSize: { width, height },
			});

			if (!sources?.length) {
				this.showMissingQrCodeError(window);

				return;
			}

			const buffer = sources[0].thumbnail.toPNG();
			const png = PNG.sync.read(buffer);

			const code = jsQR(
				Uint8ClampedArray.from(png.data),
				png.width,
				png.height,
			);

			if (!code) {
				this.showMissingQrCodeError(window);

				return;
			}

			const secret = code.data.match(/secret=(([2-7A-Z]{8})+)/);

			if (!secret) {
				dialog.showMessageBox(window, {
					title: 'QR code reader error',
					type: 'warning',
					message: `Invalid QR code data`,
				});

				return;
			}

			return secret[1];
		});

		ipcMain.on(IpcChannel.LogError, (_, error) => {
			const logPath = app.getPath('logs');
			if (!existsSync(logPath)) mkdirSync(logPath, { recursive: true });

			writeFileSync(
				join(logPath, `error_log_report_${getDateString()}`),
				error,
			);
		});

		ipcMain.handle(IpcChannel.ClearRecentlyOpened, () => {
			try {
				writeFileSync(
					this._configService.workspacesPath,
					'{"recentlyOpened": [], "workspace": null}',
					{ encoding: 'utf8' },
				);

				return true;
			} catch {
				return false;
			}
		});
	}

	private showMissingQrCodeError(window: BrowserWindow) {
		dialog.showMessageBox(window, {
			title: 'QR code reader error',
			type: 'warning',
			message: `No otpauth QR code was found:
						- make sure it's visible in the foreground,
						- try zooming the code in and scan again,
						- if none of the above works, you can manually add a secret in Advanced options of password entry.`,
		});
	}
}

export function bootstrapApp() {
	new MainProcess();
}
