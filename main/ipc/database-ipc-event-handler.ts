import {
	IpcMainEvent,
	IpcMainInvokeEvent,
	app,
	dialog,
	ipcMain,
} from 'electron';
import { Product } from '@root/product';
import {
	ExposedPasswordEntry,
	IpcChannel,
	WeakPasswordEntry,
} from '@shared-renderer/index';
import { readdirSync, unlinkSync, writeFileSync } from 'fs';
import { generate } from 'generate-password';
import { basename, join } from 'path';
import { createServiceDecorator } from '../di';
import { ProcessArgument } from '../process-argument.enum';
import { IConfigService } from '../services/config';
import { IDatabaseService, SaveFilePayload } from '../services/database';
import { INativeApiService } from '../services/native';
import { IWindowService } from '../services/window';
import {
	CsvWriter,
	getDateString,
	getDefaultPath,
	getFileFilter,
} from '../util';
import { IIpcEventHandler } from './ipc-event-handler.model';

export const IDatabaseIpcEventHandler =
	createServiceDecorator<DatabaseIpcEventHandler>('databaseIpcEventHandler');

export class DatabaseIpcEventHandler implements IIpcEventHandler {
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);

	constructor(
		@IDatabaseService private readonly _databaseService: IDatabaseService,
		@IWindowService private readonly _windowService: IWindowService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
		@IConfigService private readonly _configService: IConfigService,
	) {}

	initialize(): void {
		ipcMain.on(IpcChannel.Lock, (event: IpcMainEvent) => {
			this._windowService.onLock(event.sender.id);

			this._databaseService.removeBrowserSession();
			this._databaseService.removeRecoveryFile(event.sender.id);
			this._databaseService.setVaultPassword(event.sender.id, null);
		});

		ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
			this._databaseService.removeRecoveryFile(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.DecryptDatabase,
			async (event: IpcMainInvokeEvent, password: string) => {
				try {
					const result = await this._databaseService.decryptDatabase(
						event.sender.id,
						password,
					);

					if (result.decrypted) {
						event.sender.send(IpcChannel.DecryptedContent, {
							decrypted: result.decrypted,
						});
					} else {
						event.sender.send(IpcChannel.DecryptedContent, {
							error: result.error,
						});
					}
				} catch {
					event.sender.send(IpcChannel.DecryptedContent, {
						error: 'An error occured reading the file',
					});
				}
			},
		);

		ipcMain.handle(
			IpcChannel.DecryptBiometrics,
			async (event: IpcMainInvokeEvent) => {
				const result = await this._databaseService.decryptWithBiometrics(
					event.sender.id,
				);

				if (result?.decrypted) {
					event.sender.send(IpcChannel.DecryptedContent, {
						decrypted: result.decrypted,
					});
				} else {
					event.sender.send(IpcChannel.DecryptedContent, {
						error: 'There was an error retrieving the password',
					});
				}
			},
		);

		ipcMain.handle(
			IpcChannel.ValidatePassword,
			(event: IpcMainInvokeEvent, password: string): boolean => {
				if (!password?.length) {
					return false;
				}

				return (
					password === this._databaseService.getVaultPassword(event.sender.id)
				);
			},
		);

		ipcMain.handle(IpcChannel.CheckOpenMode, (event: IpcMainInvokeEvent) => {
			return this._databaseService.getFilePath(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.SaveFile,
			(event: IpcMainInvokeEvent, payload: SaveFilePayload) => {
				return this._databaseService.saveDatabase(event.sender.id, payload);
			},
		);

		ipcMain.handle(
			IpcChannel.OpenFile,
			(event: IpcMainInvokeEvent, path: string) => {
				return this._databaseService.openDatabase(event.sender.id, path);
			},
		);

		ipcMain.handle(
			IpcChannel.DropFile,
			(event: IpcMainInvokeEvent, filePath: string) => {
				this._databaseService.setDatabaseEntry(event.sender.id, filePath);
				this._windowService.setTitle(event.sender.id, basename(filePath));

				return this._databaseService.getFilePath(event.sender.id);
			},
		);

		ipcMain.handle(
			IpcChannel.ToggleBiometricsUnlock,
			async (event: IpcMainInvokeEvent, isEnabled) => {
				const path = this._databaseService.getFilePath(event.sender.id) as string;
				if (isEnabled) {
					this._nativeApiService.saveCredential(
						path,
						this._databaseService.getVaultPassword(event.sender.id) as string,
					);
				} else {
					this._nativeApiService.removeCredential(path);
				}

				return true;
			},
		);

		ipcMain.handle(
			IpcChannel.ScanLeaks,
			(event: IpcMainInvokeEvent, database: string) => {
				return this._databaseService.getLeaks(event.sender.id, database);
			},
		);

		ipcMain.handle(
			IpcChannel.GetWeakPasswords,
			(event: IpcMainInvokeEvent, database: string) => {
				return this._databaseService.getWeakPasswords(
					event.sender.id,
					database,
				);
			},
		);

		ipcMain.handle(
			IpcChannel.SaveExposedPasswordsReport,
			async (event: IpcMainInvokeEvent, result: ExposedPasswordEntry[]) => {
				const date = new Date();
				const saveReturnValue = await dialog.showSaveDialog(
					this._windowService.getWindowByWebContentsId(event.sender.id)
						.browserWindow,
					{
						defaultPath: getDefaultPath(
							this._configService.appConfig,
							`exposed_passwords_report_${getDateString(date)}`,
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
					} catch {
						throw new Error('Failed to save leaked password report');
					}
				}

				return false;
			},
		);

		ipcMain.handle(
			IpcChannel.SaveWeakPasswordsReport,
			async (event: IpcMainInvokeEvent, result: WeakPasswordEntry[]) => {
				const date = new Date();
				const saveReturnValue = await dialog.showSaveDialog(
					this._windowService.getWindowByWebContentsId(event.sender.id)
						.browserWindow,
					{
						defaultPath: getDefaultPath(
							this._configService.appConfig,
							`weak_passwords_report_${getDateString(date)}`,
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
					} catch {
						throw new Error('Failed to save weak passwords report');
					}
				}

				return false;
			},
		);

		ipcMain.handle(IpcChannel.CreateNew, async (event: IpcMainInvokeEvent) => {
			this._databaseService.fileMap.delete(event.sender.id);
			return true;
		});

		ipcMain.handle(
			IpcChannel.ChangeScreenLockSettings,
			(_: IpcMainInvokeEvent, settings: Partial<Product>) => {
				this._databaseService.changeEncryptionSettings(settings);
			},
		);

		ipcMain.handle(
			IpcChannel.GeneratePassword,
			(_: IpcMainInvokeEvent, options) => {
				return generate(options);
			},
		);

		ipcMain.handle(IpcChannel.RecoverFile, (event: IpcMainInvokeEvent) => {
			try {
				return this._databaseService.recoverFile(event.sender.id);
			} catch {
				return null;
			}
		});

		ipcMain.handle(
			IpcChannel.CheckRecoveryFile,
			(event: IpcMainInvokeEvent) => {
				return this._databaseService.checkRecoveryFileExists(event.sender.id);
			},
		);

		ipcMain.handle(
			IpcChannel.RemoveRecoveryFile,
			(event: IpcMainInvokeEvent) => {
				return this._databaseService.removeRecoveryFile(event.sender.id);
			},
		);

		ipcMain.handle(
			IpcChannel.DatabaseChanged,
			(event: IpcMainInvokeEvent, payload: SaveFilePayload) => {
				return this._databaseService.saveDatabaseSnapshot(
					event.sender.id,
					payload,
				);
			},
		);

		if (this._isTestMode) {
			ipcMain.handle(IpcChannel.TestCleanup, () => {
				try {
					const files = readdirSync(this._configService.appConfig.e2eFilesPath);
					files
						.filter((f) => /test_\d+\.(fbit|csv)/.test(f))
						.forEach((f) =>
							unlinkSync(join(this._configService.appConfig.e2eFilesPath, f)),
						);

					return true;
				} catch {
					return false;
				}
			});
		}

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
}
