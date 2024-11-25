import { getDefaultPath, getFileFilter, getHashCode } from '@root/main/util';
import { Product } from '@root/product';
import { IpcChannel, VaultSchema } from '@shared-renderer/index';
import {
	app,
	dialog,
	powerMonitor,
	safeStorage,
	session,
	IpcMainInvokeEvent,
} from 'electron';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	renameSync,
	unlinkSync,
} from 'fs';
import { emptyDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { basename, join } from 'path';
import { ProcessArgument } from '../../process-argument.enum';
import { IConfigService } from '../config';
import { IEncryptionEventService } from '../encryption/encryption-event-service.model';
import { IIconService } from '../icon';
import { INativeApiService } from '../native';
import { IWebApiService } from '../web-api';
import { IWindowService } from '../window';
import { IWindow } from '../window/window-model';
import { IDatabaseService } from './database-service.model';
import { SaveFilePayload } from './save-file-payload';
import { SaveDatabaseResult } from '../../types/save-database-result';

export class DatabaseService implements IDatabaseService {
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);
	private readonly _tmpDirectoryPath: string;
	private readonly _fileMap: Map<number, { file: string; password?: Buffer }> =
		new Map<number, { file: string; password?: Buffer }>();
	private readonly _screenLockHandler = () => {
		this.onAppExit();
		this._windowService.windows.forEach((win) => {
			if (this._fileMap.get(win.browserWindow.id)) {
				win.browserWindow.webContents.send(IpcChannel.Lock);
			}
		});
	};

	get fileMap(): Map<number, { file: string; password?: Buffer }> {
		return this._fileMap;
	}

	public setPassword(value: string, windowId: number) {
		if (windowId === this._windowService.getWindow(1).id) {
			return;
		}

		const fileEntry = this._fileMap.get(windowId);

		if (!value) {
			fileEntry.password = null;
		} else {
			fileEntry.password = safeStorage.isEncryptionAvailable()
				? safeStorage.encryptString(value)
				: Buffer.from(value);
		}
	}

	public getPassword(windowId: number): string {
		const password = this._fileMap.get(windowId)?.password;

		if (!password) {
			return null;
		}

		return safeStorage.isEncryptionAvailable()
			? safeStorage.decryptString(password)
			: password.toString();
	}

	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@IWindowService private readonly _windowService: IWindowService,
		@IWindowService private readonly _iconService: IIconService,
		@IWebApiService private readonly _webApiService: IWebApiService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
		@IEncryptionEventService
		private readonly _encryptionEventService: IEncryptionEventService,
	) {
		this._tmpDirectoryPath = join(
			app.getPath('appData'),
			this._configService.appConfig.name.toLowerCase(),
			'tmp',
		);
		if (!existsSync(this._tmpDirectoryPath)) {
			mkdirSync(this._tmpDirectoryPath);
		}

		if (this._configService.appConfig.lockOnSystemLock) {
			powerMonitor.addListener('lock-screen', this._screenLockHandler);
		}
	}

	public async biometricsDecrypt(event: IpcMainInvokeEvent): Promise<void> {
		let password: string;

		if (this._isTestMode) {
			password = 'test123';
		} else {
			password = await this._nativeApiService.getPassword(
				this._windowService
					.getWindowByWebContentsId(event.sender.id)
					.browserWindow.getNativeWindowHandle(),
				this.getFilePath(event.sender.id),
			);
		}

		if (password) {
			this.decryptDatabase(event, password);
		} else {
			this._windowService
				.getWindowByWebContentsId(event.sender.id)
				.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
					error: 'There was an error retrieving the password',
				});
		}
	}

	public onAppExit() {
		this._fileMap.forEach((x) => {
			x.password = null;
		});

		this.removeBrowserSession();
	}

	public clearRecoveryFiles() {
		emptyDirSync(this._tmpDirectoryPath);
	}

	public setDatabaseEntry(windowId: number, filePath: string) {
		this._fileMap.set(windowId, { file: filePath });
		const workspaces: { recentlyOpened: string[] } =
			this._configService.appConfig.workspaces;
		const fileIndex = workspaces.recentlyOpened.findIndex(
			(x) => x === filePath,
		);

		if (fileIndex > -1) {
			workspaces.recentlyOpened.splice(fileIndex, 1);
		}

		workspaces.recentlyOpened.unshift(filePath);

		if (workspaces.recentlyOpened.length > 10) {
			workspaces.recentlyOpened.length = 10;
		}

		writeFileSync(
			this._configService.workspacesPath,
			JSON.stringify({
				workspace: filePath,
				recentlyOpened: workspaces.recentlyOpened,
			}),
			{ encoding: 'utf8' },
		);

		this.sendRecentlyOpenedFiles();
	}

	public getFilePath(windowId: number): string {
		return this._fileMap.get(windowId)?.file;
	}

	public async saveDatabase(
		event: IpcMainInvokeEvent,
		saveFilePayload: SaveFilePayload,
	): Promise<SaveDatabaseResult> {
		let savePath: Electron.SaveDialogReturnValue = {
			filePath: this._fileMap.get(event.sender.id)?.file,
			canceled: false,
		};
		const window = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		);

		if (
			saveFilePayload.config?.forceNew ||
			(!this.getPassword(event.sender.id) && saveFilePayload.password)
		) {
			savePath = await dialog.showSaveDialog(window.browserWindow, {
				defaultPath: getDefaultPath(this._configService.appConfig, ''),
				filters: [getFileFilter(this._configService.appConfig, 'vaultExt')],
			});

			if (savePath.canceled) {
				return { status: false };
			}

			const existingPassword = this.getPassword(event.sender.id);
			this.setDatabaseEntry(event.sender.id, savePath.filePath);
			this.setPassword(
				saveFilePayload.password ?? existingPassword,
				event.sender.id,
			);
			this._windowService.setIdleTimer();
		}

		const password =
			saveFilePayload.password ?? this.getPassword(event.sender.id);
		const payload = await this._encryptionEventService.saveDatabase(
			this._configService.appConfig.schemaVersion,
			saveFilePayload.database,
			password,
			window.key,
		);
		const finalFilePath = savePath.filePath.endsWith(
			this._configService.appConfig.fileExtension,
		)
			? savePath.filePath
			: this.appendExtension(savePath.filePath);

		try {
			const temporaryPath = this.createTemporaryPathFrom(finalFilePath);

			try {
				writeFileSync(temporaryPath, payload.encrypted, { encoding: 'base64' });
			} catch {
				unlinkSync(temporaryPath);
				return;
			}

			try {
				copyFileSync(temporaryPath, finalFilePath);
			} catch {
				renameSync(temporaryPath, finalFilePath);
				return;
			}

			unlinkSync(temporaryPath);

			this._fileMap.get(event.sender.id).file = finalFilePath;
			this._windowService.setTitle(event.sender.id, basename(finalFilePath));
			this.removeRecoveryFile(event.sender.id);

			if (
				this._configService.appConfig.biometricsProtectedFiles.includes(
					finalFilePath,
				)
			) {
				this._nativeApiService.saveCredential(finalFilePath, password);
			}

			this.sendRecentlyOpenedFiles();

			return {
				status: true,
				file: finalFilePath,
				notify: saveFilePayload.config?.notify ?? true,
			};
		} catch (err) {
			return { status: false, error: err };
		}
	}

	public async saveDatabaseSnapshot(
		event: IpcMainInvokeEvent,
		{ database },
	): Promise<void> {
		const window = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		);
		const payload = await this._encryptionEventService.saveDatabase(
			this._configService.appConfig.schemaVersion,
			database,
			this.getPassword(event.sender.id),
			window.key,
		);
		const tmpFileName = getHashCode(this.getFilePath(window.browserWindow.id));

		writeFileSync(
			join(this._tmpDirectoryPath, `~${tmpFileName}.tmp`),
			payload.encrypted,
			{ encoding: 'base64' },
		);
	}

	public async openDatabase(
		event: IpcMainInvokeEvent,
		path: string,
	): Promise<string> {
		let openDialogReturnValue;

		if (!path) {
			openDialogReturnValue = await dialog.showOpenDialog({
				properties: ['openFile'],
				defaultPath: getDefaultPath(this._configService.appConfig, ''),
				filters: [getFileFilter(this._configService.appConfig, 'vaultExt')],
			});
		}

		if (!openDialogReturnValue?.canceled || path) {
			if (path && !existsSync(path)) {
				const workspaces = {
					workspace: this._configService.appConfig.workspaces.workspace,
					recentlyOpened:
						this._configService.appConfig.workspaces.recentlyOpened.filter(
							(x) => x !== path,
						),
				};
				writeFileSync(
					this._configService.workspacesPath,
					JSON.stringify(workspaces),
					{ encoding: 'utf8' },
				);
				this._configService.set({ workspaces });

				dialog.showMessageBoxSync({
					type: 'info',
					title: this._configService.appConfig.name,
					message: 'Path does not exist',
					detail: `The path: '${path}' does not exist.`,
				});

				this.sendRecentlyOpenedFiles();
				return;
			}

			this.setDatabaseEntry(
				event.sender.id,
				openDialogReturnValue?.filePaths[0] ?? path,
			);

			return this.getFilePath(event.sender.id);
		}
	}

	public async decryptDatabase(
		event: IpcMainInvokeEvent,
		password: string,
	): Promise<void> {
		const window = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		);
		const key = this._windowService.getSecureKey();

		try {
			const fileData = readFileSync(this.getFilePath(event.sender.id), {
				encoding: 'base64',
			});
			const payload = await this._encryptionEventService.decryptDatabase(
				fileData,
				password,
				key,
			);

			if (!payload.error) {
				window.key = key;
				this.setPassword(password, event.sender.id);
				const parsedDb: VaultSchema = JSON.parse(payload.decrypted);

				for (const entry of parsedDb.tables.entries) {
					if (entry.type === 'password') {
						this._iconService.fixIcon(entry);
					}
				}

				payload.decrypted = JSON.stringify(parsedDb);

				this.startBackgroundChecks(window, parsedDb);
				this._windowService.setIdleTimer();

				window.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
					decrypted: payload.decrypted,
				});
			} else {
				window.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
					error: 'Password is incorrect',
				});
			}
		} catch {
			window.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
				error: 'An error occured reading the file',
			});
		}
	}

	public async getLeaks(event: IpcMainInvokeEvent, database: string) {
		const key = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		).key;
		return await this._encryptionEventService.getLeaks(database, key);
	}

	public async getWeakPasswords(event: IpcMainInvokeEvent, database: string) {
		const key = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		).key;
		return await this._encryptionEventService.getWeakPasswords(database, key);
	}

	public changeEncryptionSettings(settings: Partial<Product>) {
		if (
			settings.lockOnSystemLock !==
			this._configService.appConfig.lockOnSystemLock
		) {
			if (settings.lockOnSystemLock) {
				powerMonitor.addListener('lock-screen', this._screenLockHandler);
			} else {
				powerMonitor.removeListener('lock-screen', this._screenLockHandler);
			}
		}
	}

	public checkRecoveryFile(windowId): string {
		const path = this.getRecoveryFilePath(windowId);

		if (existsSync(path)) {
			return path;
		}
	}

	public removeRecoveryFile(windowId) {
		const path = this.getRecoveryFilePath(windowId);
		if (path && existsSync(path)) {
			unlinkSync(path);
		}
	}

	public removeBrowserSession(): Promise<void> {
		return session.defaultSession.clearStorageData();
	}

	public async recoverFile(windowId: number) {
		const key = this._windowService.getWindowByWebContentsId(windowId).key;

		try {
			const fileData = readFileSync(this.getRecoveryFilePath(windowId), {
				encoding: 'base64',
			});
			const payload = await this._encryptionEventService.decryptDatabase(
				fileData,
				this.getPassword(windowId),
				key,
			);

			return payload.decrypted;
		} catch {
			return null;
		}
	}

	private startBackgroundChecks(window: IWindow, parsedDb: VaultSchema) {
		this.startPasswordEntriesBackgroundChecks(window, parsedDb);
	}

	private startPasswordEntriesBackgroundChecks(
		window: IWindow,
		parsedDb: VaultSchema,
	) {
		const entries = parsedDb.tables.entries.filter(
			(x) => x.type === 'password',
		);

		this._iconService.getIcons(window.browserWindow.id, entries);
		this._webApiService.checkSecureProtocol(window.browserWindow.id, entries);
		this._webApiService.checkTfa(window.browserWindow.id, entries);
	}

	private appendExtension(name: string): string {
		return `${name}.${this._configService.appConfig.fileExtension}`;
	}

	private createTemporaryPathFrom(path: string) {
		const temp = path.split('.');
		temp.pop();

		return temp.join('') + '~';
	}

	private getRecoveryFilePath(windowId: number): string {
		const path = this.getFilePath(windowId);
		if (!path) {
			return;
		}

		const tmpFileName = getHashCode(this.getFilePath(windowId));
		return join(this._tmpDirectoryPath, `~${tmpFileName}.tmp`);
	}

	private sendRecentlyOpenedFiles() {
		this._windowService.windows.forEach((w) => {
			w.browserWindow.webContents.send(
				IpcChannel.GetRecentFiles,
				this._configService.appConfig.workspaces.recentlyOpened,
			);
		});
	}
}
