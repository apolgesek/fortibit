/* eslint-disable @typescript-eslint/no-var-requires */

import { IpcChannel } from '@shared-renderer/index';
import {
	app,
	BrowserWindow,
	globalShortcut,
	ipcMain,
	Menu,
	nativeTheme,
	shell,
} from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { basename, resolve } from 'path';
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

	constructor() {
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

			const isAlreadyOpenFile = Array.from(this._databaseService.fileMap.values()).find(x => x.file === filePath);
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

		process.on('unhandledRejection', (reason, promise) => {
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
		const mainWindow = this._windowService.createMainWindow();
		const entrySelectWindow = this._windowService.createEntrySelectWindow();
		this.registerIpcEventListeners();

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

		this.setFile(mainWindow, this._fileArg);
		await this._windowService.loadWindow(mainWindow, null);

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

			if (this._isTestMode) {
				const absolutePath = resolve('..\\e2e\\files\\test.fbit');
				path.workspace =
					absolutePath.slice(0, 1).toUpperCase() + absolutePath.slice(1);
			}

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
	}
}

export function bootstrapApp() {
	new MainProcess();
}
