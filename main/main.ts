import { Logger } from '@root/main/core/logger/logger';
import { IpcChannel } from '@shared-renderer/index';
import { randomBytes } from 'crypto';
import {
	app,
	BrowserWindow,
	globalShortcut,
	ipcMain,
	Menu,
	nativeTheme,
	Notification,
	shell,
} from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { basename, join, resolve } from 'path';
import { SingleInstanceServices } from './di';
import {
	IAutotypeIpcEventHandler,
	IClipboardIpcEventHandler,
	IConfigIpcEventHandler,
	IEncryptionIpcEventHandler,
	IExportIpcEventHandler,
	IIconIpcEventHandler,
	IImportIpcEventHandler,
	IIpcEventHandler,
	ITotpIpcEventHandler,
	IUpdateIpcEventHandler,
} from './ipc';
import { IDatabaseIpcEventHandler } from './ipc/database-ipc-event-handler';
import { IWindowIpcEventHandler } from './ipc/window-ipc-event-handler';
import { ProcessArgument } from './process-argument.enum';
import { IAutotypeService } from './services/autotype';
import { IClipboardService } from './services/clipboard';
import { IConfigService } from './services/config';
import { IDatabaseService } from './services/database';
import { IPerformanceService } from './services/performance/performance-service.model';
import { IWindowService } from './services/window';

class MainProcess {
	private readonly _services: SingleInstanceServices;
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);
	private readonly appProtocol = 'fbit';
	private readonly sessionToken = randomBytes(32).toString('hex');

	private _fileArg: string | undefined;

	private get _databaseService(): IDatabaseService {
		return this._services.get(IDatabaseService);
	}

	private get _windowService(): IWindowService {
		return this._services.get(IWindowService);
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

	private get _encryptionIpcEventHandler() {
		return this._services.get(IEncryptionIpcEventHandler);
	}

	private get _totpIpcEventHandler() {
		return this._services.get(ITotpIpcEventHandler);
	}

	constructor() {
		app.setAsDefaultProtocolClient(
			this.appProtocol,
			process.execPath,
			app.commandLine.hasSwitch(ProcessArgument.Serve)
				? [resolve(process.argv[1])]
				: undefined,
		);

		app.setAppLogsPath(join(app.getPath('appData'), 'fortibit', 'logs'));
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
			const url = argv.find((arg) => arg.startsWith(`${this.appProtocol}://`));
			if (url) {
				this.handleUrl(url);
				return;
			}

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

		app.on('open-url', (event, url) => {
			event.preventDefault();
			this.handleUrl(url);
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

		this._windowService.loadWindow(mainWindow).then(() => {
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

		app.setAppUserModelId(process.execPath);
		ipcMain.on(
			IpcChannel.ShowNotification,
			(event: Electron.IpcMainEvent, { threats }) => {
				const vaultPath = this._databaseService.fileMap.get(
					event.sender.id,
				)?.file;
				new Notification({
					toastXml: `<?xml version="1.0"?>
					<toast launch="${this.appProtocol}://?action=click" activationType="protocol"><visual><binding template="ToastGeneric"><text>Reports generated. Detected threats: ${threats}</text><text placement="attribution">${vaultPath}</text></binding></visual><actions><action content="Show reports" arguments="${this.appProtocol}://?action=showReports&amp;windowId=${event.sender.id}&amp;sessionToken=${this.sessionToken}" activationType="protocol"/></actions></toast>
				`,
				}).show();
			},
		);

		try {
			this._performanceService.mark('firstWindowLoaded');
		} catch (err) {
			console.log(err);
		}
	}

	private setFile(windowRef: BrowserWindow, filePath?: string) {
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
			this._encryptionIpcEventHandler,
			this._totpIpcEventHandler,
		];

		ipcEventHandlers.forEach((handler) => handler.initialize());

		ipcMain.handle(IpcChannel.GetWhitelistedChannels, () => {
			return Object.values(IpcChannel);
		});

		ipcMain.handle(IpcChannel.GetPlatformInfo, () => {
			return platform();
		});

		ipcMain.on(IpcChannel.OpenUrl, async (_, url: string) => {
			if (!/^https?/.test(url)) {
				url = 'http://' + url;
			}

			shell.openExternal(url);
		});

		ipcMain.on(IpcChannel.LogError, (_, error) => {
			Logger.logError(error);
		});
	}

	private handleUrl(url: string) {
		const parsedUrl = new URL(url);

		const action = parsedUrl.searchParams.get('action');
		const windowId = parsedUrl.searchParams.get('windowId');
		const sessionToken = parsedUrl.searchParams.get('sessionToken');

		if (sessionToken !== this.sessionToken) {
			return;
		}

		if (!action || !windowId)
			throw new Error('Invalid URL. Missing action or windowId');

		const browserWindow = this._windowService.getWindowByWebContentsId(
			parseInt(windowId),
		).browserWindow;

		browserWindow.show();

		this._windowService.sendMessage(
			parseInt(windowId),
			IpcChannel['UrlAction_' + action],
		);
	}
}

export function bootstrapApp() {
	new MainProcess();
}
