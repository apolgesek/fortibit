import {
	CsvWriter,
	getDefaultPath,
	getFileFilter,
	getHashCode,
} from '@root/main/util';
import { Product } from '@root/product';
import { ImportHandler, IpcChannel, VaultSchema } from '@shared-renderer/index';
import {
	IpcMainEvent,
	IpcMainInvokeEvent,
	app,
	dialog,
	ipcMain,
	powerMonitor,
	safeStorage,
	session,
} from 'electron';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	unlinkSync,
} from 'fs';
import { emptyDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { generate } from 'generate-password';
import { basename, join } from 'path';
import { ProcessArgument } from '../../process-argument.enum';
import { IConfigService } from '../config';
import { IEncryptionEventService } from '../encryption/encryption-event-service.model';
import { IExportService } from '../export';
import { IIconService } from '../icon';
import { IImportService } from '../import';
import { INativeApiService } from '../native';
import { IWindowService } from '../window';
import { IDatabaseService } from './database-service.model';
import { SaveFilePayload } from './save-file-payload';

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

	setPassword(value: string, windowId: number) {
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

	getPassword(windowId: number): string {
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
		@IImportService private readonly _importService: IImportService,
		@IExportService private readonly _exportService: IExportService,
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

		ipcMain.on(IpcChannel.Lock, (event: IpcMainEvent) => {
			this._windowService.onLock(event.sender.id);

			this.removeBrowserSession();
			this.removeRecoveryFile(event.sender.id);
			this.setPassword(null, event.sender.id);
		});

		ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
			this.removeRecoveryFile(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.DecryptDatabase,
			async (event: IpcMainEvent, password: string) => {
				return await this.decryptDatabase(event, password);
			},
		);

		ipcMain.handle(IpcChannel.DecryptBiometrics, async (event: IpcMainEvent) => {
			return await this.biometricsDecrypt(event);
		});

		ipcMain.handle(
			IpcChannel.ValidatePassword,
			(event: IpcMainEvent, password: string): boolean => {
				if (!password?.length) {
					return false;
				}

				return password === this.getPassword(event.sender.id);
			},
		);

		ipcMain.handle(IpcChannel.CheckOpenMode, (event: IpcMainInvokeEvent) => {
			return this.getFilePath(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.SaveFile,
			async (event: IpcMainEvent, payload: SaveFilePayload) => {
				return await this.saveDatabase(event, payload);
			},
		);

		ipcMain.handle(IpcChannel.OpenFile, async (event: IpcMainEvent, path: string) => {
			return await this.openDatabase(event, path);
		});

		ipcMain.handle(IpcChannel.DropFile, (event: IpcMainEvent, filePath: string) => {
			this.setDatabaseEntry(event.sender.id, filePath);
			this._windowService.setTitle(event.sender.id, basename(filePath));

			return this.getFilePath(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.ToggleBiometricsUnlock,
			async (event: IpcMainEvent, isEnabled) => {
				const path = this.getFilePath(event.sender.id);
				if (isEnabled) {
					this._nativeApiService.saveCredential(
						path,
						this.getPassword(event.sender.id),
					);
				} else {
					this._nativeApiService.removeCredential(path);
				}

				return true;
			},
		);

		ipcMain.handle(
			IpcChannel.GetImportedDatabaseMetadata,
			async (_: IpcMainEvent, type: ImportHandler) => {
				this._importService.setHandler(type);
				return await this._importService.getHandler().getMetadata();
			},
		);

		ipcMain.handle(
			IpcChannel.Import,
			async (event: IpcMainEvent, filePath: string, type: ImportHandler) => {
				this._importService.setHandler(type);
				return await this._importService.getHandler().import(event, filePath);
			},
		);

		ipcMain.handle(
			IpcChannel.ScanLeaks,
			async (event: IpcMainEvent, database: string) => {
				return await this.getLeaks(event, database);
			},
		);

		ipcMain.handle(
			IpcChannel.GetWeakPasswords,
			async (event: IpcMainEvent, database: string) => {
				return await this.getWeakPasswords(event, database);
			},
		);

		ipcMain.handle(
			IpcChannel.SaveExposedPasswordsReport,
			async (event: IpcMainEvent, result: any[]) => {
				const date = new Date();
				const saveReturnValue = await dialog.showSaveDialog(
					this._windowService.getWindowByWebContentsId(event.sender.id)
						.browserWindow,
					{
						defaultPath: getDefaultPath(
							this._configService.appConfig,
							`exposed_passwords_report_${date
								.getDate()
								.toString()
								.padStart(2, '0')}-${(date.getMonth() + 1)
								.toString()
								.padStart(2, '0')}-${date.getFullYear()}`,
						),
						filters: [getFileFilter(this._configService.appConfig, 'csv')],
					},
				);

				if (saveReturnValue.filePath && !saveReturnValue.canceled) {
					try {
						CsvWriter.writeFile(saveReturnValue.filePath, result, [
							'title',
							'username',
							'occurrences',
						]);

						return true;
					} catch (err) {
						throw new Error('Failed to save leaked password report');
					}
				}

				return false;
			},
		);

		ipcMain.handle(
			IpcChannel.SaveWeakPasswordsReport,
			async (event: IpcMainEvent, result: any[]) => {
				const date = new Date();
				const saveReturnValue = await dialog.showSaveDialog(
					this._windowService.getWindowByWebContentsId(event.sender.id)
						.browserWindow,
					{
						defaultPath: getDefaultPath(
							this._configService.appConfig,
							`weak_passwords_report_${date
								.getDate()
								.toString()
								.padStart(2, '0')}-${(date.getMonth() + 1)
								.toString()
								.padStart(2, '0')}-${date.getFullYear()}`,
						),
						filters: [getFileFilter(this._configService.appConfig, 'csv')],
					},
				);

				if (saveReturnValue.filePath && !saveReturnValue.canceled) {
					try {
						CsvWriter.writeFile(saveReturnValue.filePath, result, [
							'title',
							'username',
							'score',
						]);

						return true;
					} catch (err) {
						throw new Error('Failed to save weak passwords report');
					}
				}

				return false;
			},
		);

		ipcMain.handle(IpcChannel.CreateNew, async (event: IpcMainEvent) => {
			this._fileMap.delete(event.sender.id);
			return true;
		});

		ipcMain.handle(
			IpcChannel.ChangeScreenLockSettings,
			(_: IpcMainEvent, form: Partial<Product>) => {
				this.changeEncryptionSettings(form);
			},
		);

		ipcMain.handle(
			IpcChannel.Export,
			async (event: IpcMainEvent, database: string) => {
				return await this._exportService.export(
					this._windowService.getWindowByWebContentsId(event.sender.id),
					database,
				);
			},
		);

		ipcMain.handle(
			IpcChannel.GeneratePassword,
			async (event: IpcMainEvent, options) => {
				return generate(options);
			},
		);

		ipcMain.handle(IpcChannel.RecoverFile, (event: IpcMainEvent) => {
			return this.recoverFile(event.sender.id);
		});

		ipcMain.handle(IpcChannel.CheckRecoveryFile, (event: IpcMainEvent) => {
			return this.checkRecoveryFile(event.sender.id);
		});

		ipcMain.handle(IpcChannel.RemoveRecoveryFile, (event: IpcMainEvent) => {
			return this.removeRecoveryFile(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.DatabaseChanged,
			async (event: IpcMainEvent, payload: SaveFilePayload) => {
				if (this._isTestMode) {
					return;
				}

				return await this.saveDatabaseSnapshot(event, payload);
			},
		);

		if (this._configService.appConfig.lockOnSystemLock) {
			powerMonitor.addListener('lock-screen', this._screenLockHandler);
		}

		if (this._isTestMode) {
			ipcMain.handle(IpcChannel.TestCleanup, (_: IpcMainEvent) => {
				try {
					const files = readdirSync(this._configService.appConfig.e2eFilesPath);
					files
						.filter((f) => /test_\d+\.(fbit|csv)/.test(f))
						.forEach((f) =>
							unlinkSync(join(this._configService.appConfig.e2eFilesPath, f)),
						);

					return true;
				} catch (err) {
					return false;
				}
			});
		}
	}

	public async biometricsDecrypt(event: IpcMainEvent): Promise<void> {
		const password: string = await this._nativeApiService.getPassword(
			this._windowService
				.getWindowByWebContentsId(event.sender.id)
				.browserWindow.getNativeWindowHandle(),
			this.getFilePath(event.sender.id),
		);

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
	}

	public getFilePath(windowId: number): string {
		return this._fileMap.get(windowId)?.file;
	}

	public async saveDatabase(
		event: IpcMainEvent,
		saveFilePayload: SaveFilePayload,
	): Promise<any> {
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
			} catch (err) {
				unlinkSync(temporaryPath);
				return;
			}

			try {
				copyFileSync(temporaryPath, finalFilePath);
			} catch (err) {
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

			this._windowService.windows.forEach((w) =>
			w.browserWindow.webContents.send(
				IpcChannel.GetRecentFiles,
				this._configService.appConfig.workspaces.recentlyOpened,
			),
		);

		return { status: true, file: finalFilePath, notify: saveFilePayload.config?.notify ?? true };
		} catch (err) {
			return { status: false, error: err };
		}
	}

	public async saveDatabaseSnapshot(
		event: IpcMainEvent,
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

	public async openDatabase(event: IpcMainEvent, path: string): Promise<string> {
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
				let workspaces = {
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

				this._windowService.windows.forEach((w) =>
					w.browserWindow.webContents.send(
						IpcChannel.GetRecentFiles,
						this._configService.appConfig.workspaces.recentlyOpened,
					),
				);
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
		event: { sender: { id: number } },
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
			let payload = await this._encryptionEventService.decryptDatabase(
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
				this._iconService.getIcons(
					window.browserWindow.id,
					parsedDb.tables.entries.filter((x) => x.type === 'password'),
				);
				this._windowService.setIdleTimer();

				window.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
					decrypted: payload.decrypted,
				});
			} else {
				window.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
					error: 'Password is invalid',
				});
			}
		} catch {
			window.browserWindow.webContents.send(IpcChannel.DecryptedContent, {
				error: 'An error occured reading the file',
			});
		}
	}

	public async getLeaks(event: IpcMainEvent, database: string) {
		const key = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		).key;
		return await this._encryptionEventService.getLeaks(database, key);
	}

	public async getWeakPasswords(event: IpcMainEvent, database: string) {
		const key = this._windowService.getWindowByWebContentsId(
			event.sender.id,
		).key;
		return await this._encryptionEventService.getWeakPasswords(database, key);
	}

	private appendExtension(name: string): string {
		return `${name}.${this._configService.appConfig.fileExtension}`;
	}

	private changeEncryptionSettings(settings: Partial<Product>) {
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

	private removeBrowserSession(): Promise<void> {
		return session.defaultSession.clearStorageData();
	}

	private createTemporaryPathFrom(path: string) {
		const temp = path.split('.');
		temp.pop();

		return temp.join('') + '~';
	}

	private checkRecoveryFile(windowId): string {
		const path = this.getRecoveryFilePath(windowId);

		if (existsSync(path)) {
			return path;
		}
	}

	private removeRecoveryFile(windowId) {
		const path = this.getRecoveryFilePath(windowId);
		if (path && existsSync(path)) {
			unlinkSync(path);
		}
	}

	private getRecoveryFilePath(windowId: number): string {
		const path = this.getFilePath(windowId);
		if (!path) {
			return;
		}

		const tmpFileName = getHashCode(this.getFilePath(windowId));
		return join(this._tmpDirectoryPath, `~${tmpFileName}.tmp`);
	}

	private async recoverFile(windowId: number) {
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
}
