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
import { readdirSync, unlinkSync } from 'fs';
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
			this._databaseService.setPassword(null, event.sender.id);
		});

		ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
			this._databaseService.removeRecoveryFile(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.DecryptDatabase,
			(event: IpcMainInvokeEvent, password: string) => {
				return this._databaseService.decryptDatabase(event, password);
			},
		);

		ipcMain.handle(
			IpcChannel.DecryptBiometrics,
			(event: IpcMainInvokeEvent) => {
				return this._databaseService.biometricsDecrypt(event);
			},
		);

		ipcMain.handle(
			IpcChannel.ValidatePassword,
			(event: IpcMainInvokeEvent, password: string): boolean => {
				if (!password?.length) {
					return false;
				}

				return password === this._databaseService.getPassword(event.sender.id);
			},
		);

		ipcMain.handle(IpcChannel.CheckOpenMode, (event: IpcMainInvokeEvent) => {
			return this._databaseService.getFilePath(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.SaveFile,
			(event: IpcMainInvokeEvent, payload: SaveFilePayload) => {
				return this._databaseService.saveDatabase(event, payload);
			},
		);

		ipcMain.handle(
			IpcChannel.OpenFile,
			(event: IpcMainInvokeEvent, path: string) => {
				return this._databaseService.openDatabase(event, path);
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
				const path = this._databaseService.getFilePath(event.sender.id);
				if (isEnabled) {
					this._nativeApiService.saveCredential(
						path,
						this._databaseService.getPassword(event.sender.id),
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
				return this._databaseService.getLeaks(event, database);
			},
		);

		ipcMain.handle(
			IpcChannel.GetWeakPasswords,
			(event: IpcMainInvokeEvent, database: string) => {
				return this._databaseService.getWeakPasswords(event, database);
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
			(_: IpcMainInvokeEvent, form: Partial<Product>) => {
				this._databaseService.changeEncryptionSettings(form);
			},
		);

		ipcMain.handle(
			IpcChannel.GeneratePassword,
			(event: IpcMainInvokeEvent, options) => {
				return generate(options);
			},
		);

		ipcMain.handle(IpcChannel.RecoverFile, (event: IpcMainInvokeEvent) => {
			return this._databaseService.recoverFile(event.sender.id);
		});

		ipcMain.handle(
			IpcChannel.CheckRecoveryFile,
			(event: IpcMainInvokeEvent) => {
				return this._databaseService.checkRecoveryFile(event.sender.id);
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
				return this._databaseService.saveDatabaseSnapshot(event, payload);
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
	}
}
