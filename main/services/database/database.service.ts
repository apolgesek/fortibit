import { IConfigService } from '@root/main/services/config';
import { IDialogService } from '@root/main/services/dialog';
import { IEncryptionEventService } from '@root/main/services/encryption';
import { IFileService } from '@root/main/services/file';
import { IIconService } from '@root/main/services/icon';
import { INativeApiService } from '@root/main/services/native';
import { IWebApiService } from '@root/main/services/web-api';
import { IWindowService } from '@root/main/services/window';
import { getHashCode } from '@root/main/util';
import { Product } from '@root/product';
import { IpcChannel, VaultSchema } from '@shared-renderer/index';
import { powerMonitor, safeStorage, session } from 'electron';
import { basename, join, parse } from 'path';
import { SaveDatabaseResult } from '../../types/save-database-result';
import { FileMap, IDatabaseService } from './';
import { SaveFilePayload } from './save-file-payload';

const MAX_RECENTLY_OPENED_HISTORY = 10;

export class DatabaseService implements IDatabaseService {
	private readonly _fileMap: FileMap = new Map();

	private readonly _screenLockHandler = () => {
		this.onAppExit();
		this._windowService.sendMessageToAll(IpcChannel.Lock);
	};

	get fileMap(): FileMap {
		return this._fileMap;
	}

	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@IWindowService private readonly _windowService: IWindowService,
		@IWindowService private readonly _iconService: IIconService,
		@IWebApiService private readonly _webApiService: IWebApiService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
		@IEncryptionEventService
		private readonly _encryptionEventService: IEncryptionEventService,
		@IFileService private readonly _fileService: IFileService,
		@IDialogService private readonly _dialogService: IDialogService,
	) {
		if (this._configService.appConfig.lockOnSystemLock) {
			powerMonitor.addListener('lock-screen', this._screenLockHandler);
		}
	}

	public setVaultPassword(windowId: number, value: string) {
		if (windowId === this._windowService.getWindow(1)?.id) return;

		const fileEntry = this._fileMap.get(windowId);

		if (!fileEntry) {
			throw new Error('File entry not found');
		}

		if (!value) {
			fileEntry.password = null;
		} else {
			fileEntry.password = safeStorage.isEncryptionAvailable()
				? safeStorage.encryptString(value)
				: Buffer.from(value);
		}
	}

	public getVaultPassword(windowId: number): string | null {
		const password = this._fileMap.get(windowId)?.password;

		if (!password) {
			return null;
		}

		return safeStorage.isEncryptionAvailable()
			? safeStorage.decryptString(password)
			: password.toString();
	}

	public onAppExit() {
		this._fileMap.forEach((x) => {
			x.password = null;
		});
		this.removeBrowserSession();
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
		workspaces.recentlyOpened.length = Math.min(
			workspaces.recentlyOpened.length,
			MAX_RECENTLY_OPENED_HISTORY,
		);

		this._fileService.writeSync(
			this._configService.workspacesPath,
			JSON.stringify({
				workspace: filePath,
				recentlyOpened: workspaces.recentlyOpened,
			}),
			'utf8',
		);

		this.sendRecentlyOpenedFiles();
	}

	public getFilePath(windowId: number): string {
		return this._fileMap.get(windowId)!.file;
	}

	public async saveDatabase(
		windowId: number,
		saveFilePayload: SaveFilePayload,
	): Promise<SaveDatabaseResult> {
		const window = this._windowService.getWindowByWebContentsId(windowId);

		let result = {
			filePath: this._fileMap.get(windowId)?.file,
			canceled: false,
		};

		if (
			saveFilePayload.config?.forceNew ||
			(!this.getVaultPassword(windowId) && saveFilePayload.password)
		) {
			result = await this._dialogService.showSaveFileDialog(
				window.browserWindow,
			);

			if (result.canceled) {
				return { status: false };
			}

			const existingPassword = this.getVaultPassword(windowId);
			this.setDatabaseEntry(windowId, result.filePath as string);
			this.setVaultPassword(
				windowId,
				saveFilePayload.password ?? existingPassword,
			);
			this._windowService.setIdleTimer();
		}

		const password =
			saveFilePayload.password ?? this.getVaultPassword(windowId);
		const payload = await this._encryptionEventService.encryptVaultData(
			this._configService.appConfig.schemaVersion,
			saveFilePayload.database,
			password,
			window.key as string,
		);
		const finalFilePath = result.filePath!.endsWith(
			this._configService.appConfig.fileExtension,
		)
			? (result.filePath as string)
			: `${result.filePath}.${this._configService.appConfig.fileExtension}`;

		try {
			this.saveVaultFile(finalFilePath, payload);
			this._fileMap.get(windowId)!.file = finalFilePath;
			this._windowService.setTitle(windowId, basename(finalFilePath));
			this.removeRecoveryFile(windowId);

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
		windowId: number,
		{ database },
	): Promise<void> {
		const window = this._windowService.getWindowByWebContentsId(windowId);
		const payload = await this._encryptionEventService.encryptVaultData(
			this._configService.appConfig.schemaVersion,
			database,
			this.getVaultPassword(windowId) as string,
			window.key as string,
		);
		const tmpFileName = getHashCode(this.getFilePath(window.browserWindow.id));

		this._fileService.writeSync(
			join(
				this._configService.tmpDir,
				`~${tmpFileName}.${this._configService.appConfig.temporaryFileExtension}`,
			),
			payload.encrypted,
			'base64',
		);
	}

	public async openDatabase(
		windowId: number,
		path: string,
	): Promise<string | undefined> {
		const window = this._windowService.getWindowByWebContentsId(windowId);
		let result: { filePaths: string[]; canceled: boolean } | null = null;

		if (!path) {
			result = await this._dialogService.showOpenFileDialog(
				window.browserWindow,
			);

			if (result.canceled) return;
		}

		if (path && !this._fileService.existsSync(path)) {
			this.handleNonExistingFileOpen(path);
			return;
		}

		this.setDatabaseEntry(windowId, result?.filePaths[0] ?? path);

		return this.getFilePath(windowId);
	}

	public async decryptDatabase(
		windowId: number,
		password: string,
	): Promise<{ decrypted?: string; error?: string }> {
		const window = this._windowService.getWindowByWebContentsId(windowId);
		const key = this._windowService.getSecureKey();
		const fileData = this._fileService.readSync(
			this.getFilePath(windowId),
			'base64',
		);
		const payload = await this._encryptionEventService.decryptVaultData(
			fileData,
			password,
			key,
		);

		if (payload.error) {
			return { error: 'Password is incorrect' };
		}

		window.key = key;
		this.setVaultPassword(windowId, password);
		const vault: VaultSchema = JSON.parse(payload.decrypted);

		for (const entry of vault.tables.entries) {
			if (entry.type === 'password') {
				this._iconService.fixIcon(entry);
			}
		}

		this.startBackgroundChecks(windowId, vault);
		this._windowService.setIdleTimer();

		return { decrypted: JSON.stringify(vault) };
	}

	public async decryptWithBiometrics(
		windowId: number,
	): Promise<{ decrypted?: string; error?: string } | undefined> {
		const password = await this._nativeApiService.getPassword(
			this._windowService
				.getWindowByWebContentsId(windowId)
				.browserWindow.getNativeWindowHandle(),
			this.getFilePath(windowId),
		);

		if (password) {
			return this.decryptDatabase(windowId, password);
		}
	}

	public async getLeaks(windowId: number, database: string) {
		return await this._encryptionEventService.getLeaks(
			database,
			this._windowService.getWindowByWebContentsId(windowId).key as string,
		);
	}

	public async getWeakPasswords(windowId: number, database: string) {
		return await this._encryptionEventService.getWeakPasswords(
			database,
			this._windowService.getWindowByWebContentsId(windowId).key as string,
		);
	}

	public checkRecoveryFileExists(windowId): string | undefined {
		const path = this.getRecoveryFilePath(windowId);

		if (this._fileService.existsSync(path)) {
			return path;
		}
	}

	public removeRecoveryFile(windowId) {
		const path = this.getRecoveryFilePath(windowId);
		if (path && this._fileService.existsSync(path)) {
			this._fileService.unlinkSync(path);
		}
	}

	public removeBrowserSession(): Promise<void> {
		return session.defaultSession.clearData();
	}

	public async recoverFile(windowId: number) {
		const key = this._windowService.getWindowByWebContentsId(windowId).key;

		const fileData = this._fileService.readSync(
			this.getRecoveryFilePath(windowId),
			'base64',
		);
		const payload = await this._encryptionEventService.decryptVaultData(
			fileData,
			this.getVaultPassword(windowId) as string,
			key as string,
		);

		return payload.decrypted;
	}

	private handleNonExistingFileOpen(path: string): void {
		const workspaces = {
			workspace: this._configService.appConfig.workspaces.workspace,
			recentlyOpened:
				this._configService.appConfig.workspaces.recentlyOpened.filter(
					(x) => x !== path,
				),
		};

		this._fileService.writeSync(
			this._configService.workspacesPath,
			JSON.stringify(workspaces),
			'utf8',
		);
		this._configService.set({ workspaces });
		this._dialogService.showInfoBox({
			message: 'Path does not exist',
			detail: `The path: '${path}' does not exist.`,
		});
		this.sendRecentlyOpenedFiles();
	}

	private startBackgroundChecks(windowId: number, vault: VaultSchema) {
		const entries = vault.tables.entries.filter((x) => x.type === 'password');

		this._iconService.getIcons(windowId, entries);
		this._webApiService.checkSecureProtocol(windowId, entries);
		this._webApiService.checkTfa(windowId, entries);
	}

	private saveVaultFile(finalFilePath: string, payload: { encrypted: string }) {
		const { dir, name } = parse(finalFilePath);
		const temporaryPath = join(dir, name) + '~';

		try {
			this._fileService.writeSync(temporaryPath, payload.encrypted, 'base64');
		} catch {
			this._fileService.unlinkSync(temporaryPath);
			throw new Error('Failed to save temporary file');
		}

		try {
			this._fileService.copySync(temporaryPath, finalFilePath);
		} catch {
			this._fileService.renameSync(temporaryPath, finalFilePath);
			throw new Error('Failed to copy temporary file');
		}

		this._fileService.unlinkSync(temporaryPath);
	}

	private getRecoveryFilePath(windowId: number): string {
		const path = this.getFilePath(windowId);
		const tmpFileName = getHashCode(path);

		return join(
			this._configService.tmpDir,
			`~${tmpFileName}.${this._configService.appConfig.temporaryFileExtension}`,
		);
	}

	private sendRecentlyOpenedFiles() {
		this._windowService.sendMessageToAll(
			IpcChannel.GetRecentFiles,
			this._configService.appConfig.workspaces.recentlyOpened,
		);
	}
}
