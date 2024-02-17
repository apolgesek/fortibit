import { IpcChannel, UpdateState } from '@shared-renderer/index';
import { app, ipcMain, IpcMainEvent } from 'electron';
import {
	emptyDirSync,
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
} from 'fs-extra';
import { request } from 'https';
import { arch, platform } from 'os';
import { join } from 'path';
import { IConfigService } from '../config/config-service.model';
import { IFileService } from '../file/file-service.model';
import { INativeApiService } from '../native/native-api.model';
import { IWindowService } from '../window/window-service.model';
import { ICommandHandler } from './command-handler.model';
import { IUpdateService } from './update-service.model';

type UpdateInformation = {
	version: string;
	fileName: string;
	url: string;
	checksum: string;
};

export class UpdateService implements IUpdateService {
	private readonly updateDirectory: string;
	private readonly fileExt = process.platform === 'win32' ? 'exe' : 'dmg';

	private _updateDestinationPath = '';
	private _executablePath = '';
	private _updateInformation: UpdateInformation;
	private _updateState: UpdateState;

	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@IWindowService private readonly _windowService: IWindowService,
		@IFileService private readonly _fileService: IFileService,
		@ICommandHandler private readonly _commandHandler: ICommandHandler,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {
		this.updateDirectory = join(
			app.getPath('appData'),
			this._configService.appConfig.name.toLowerCase(),
			'update',
		);

		ipcMain.on(IpcChannel.GetUpdateState, async (event: IpcMainEvent) => {
			if (!this.updateState) {
				return;
			}

			this._windowService
				.getWindowByWebContentsId(event.sender.id)
				.browserWindow.webContents.send(
					IpcChannel.UpdateState,
					this.updateState,
					this._updateInformation?.version,
				);
		});

		ipcMain.on(IpcChannel.CheckUpdate, (event: IpcMainEvent) => {
			this.checkForUpdates().catch((err) => {
				this.setUpdateState(UpdateState.ConnectionFailed);
			});
		});

		ipcMain.once(IpcChannel.UpdateAndRelaunch, () => {
			this.updateAndRelaunch();
		});
	}

	public get updateState() {
		return this._updateState;
	}

	checkForUpdates(): Promise<boolean> {
		if (!existsSync(this.updateDirectory)) {
			mkdirSync(this.updateDirectory, { recursive: true });
		}

		return new Promise((resolve, reject) => {
			if (
				this.updateState === UpdateState.Available ||
				this.updateState === UpdateState.Downloaded
			) {
				// reannounce update status
				this.setUpdateState(this.updateState);
				resolve(true);
				return;
			}

			const req = request(this._configService.appConfig.updateUrl, (res) => {
				let body = '';

				res.on('data', async (data: Buffer) => {
					body += data.toString();
				});

				res.on('error', (err) => {
					reject(err);
				});

				res.on('end', () => {
					const idx = process.platform === 'win32' ? 0 : 1;
					const updateMetadataArray = body.trim().split('\n')[idx].split(',');
					const updateMetadata = {
						productName: updateMetadataArray[0],
						version: updateMetadataArray[1],
						checksum: updateMetadataArray[2],
						commit: updateMetadataArray[3],
					};

					const isUpdateAvailable =
						updateMetadata.version.localeCompare(app.getVersion()) === 1;

					if (isUpdateAvailable) {
						this.resolveUpdateInformation(updateMetadata);
						this.setUpdateState(UpdateState.Available);

						if (!this.isAnyValidUpdateFile()) {
							this.getUpdate();
						}
					} else {
						this.setUpdateState(UpdateState.NotAvailable);
					}

					resolve(isUpdateAvailable);
				});
			}).on('error', (err) => {
				reject(err);
			});

			req.end();
		});
	}

	public isNewUpdateAvailable(): boolean {
		return !!this._updateInformation;
	}

	async updateAndRelaunch(): Promise<void> {
		this._windowService.windows.forEach((window) => {
			window.browserWindow.hide();
		});

		this.spawnUpdateProcess();
	}

	private isFileVerified(filePath: string): boolean {
		return this._nativeApiService.verifySignature(
			filePath,
			this._configService.appConfig.signatureSubject,
		);
	}

	private isAnyValidUpdateFile(): boolean {
		const updateFilePaths = readdirSync(this.updateDirectory);

		if (
			updateFilePaths.some(
				(fileName) =>
					fileName === this._executablePath &&
					this.isFileVerified(join(this.updateDirectory, fileName)),
			)
		) {
			this.setUpdateState(UpdateState.Downloaded);
			return true;
		}

		return false;
	}

	private spawnUpdateProcess() {
		this._commandHandler.updateApp(this._executablePath, this.updateDirectory);
	}

	private async getUpdate(): Promise<string> {
		this.cleanup();

		const onError = () => {
			this.cleanup();
		};

		const onFinish = () => {
			renameSync(
				this._updateDestinationPath,
				this.getExecutablePath(this._updateDestinationPath),
			);
			setTimeout(() => {
				this.isAnyValidUpdateFile();
			});
		};

		const onDownload = (progress: string) => {
			this._windowService.windows.forEach((w) =>
				w.browserWindow.webContents.send(IpcChannel.UpdateProgress, progress),
			);
		};

		return this._fileService.download(
			this._updateInformation.url,
			this._updateDestinationPath,
			onError,
			onFinish,
			onDownload,
		);
	}

	private cleanup() {
		emptyDirSync(this.updateDirectory);
	}

	private getExecutablePath(path: string) {
		const pathParts = path.split('.');
		pathParts.pop();
		pathParts.push(this.fileExt);

		return pathParts.join('.');
	}

	private resolveUpdateInformation(updateMetadata) {
		this._updateInformation = {
			version: null,
			fileName: null,
			url: null,
			checksum: null,
		};

		this._updateInformation.version = updateMetadata.version;
		this._updateInformation.fileName = `${this._configService.appConfig.name.toLowerCase()}_${
			updateMetadata.version
		}_${platform()}_${arch()}_update.${
			this._configService.appConfig.temporaryFileExtension
		}`;
		this._updateInformation.url = `${
			this._configService.appConfig.webUrl
		}/update/${this._updateInformation.fileName.replace(
			`.${this._configService.appConfig.temporaryFileExtension}`,
			`.${this.fileExt}`,
		)}`;
		this._updateInformation.checksum = updateMetadata.checksum;
		this._updateDestinationPath = join(
			this.updateDirectory,
			this._updateInformation.fileName,
		);
		this._executablePath = this.getExecutablePath(
			this._updateInformation.fileName,
		);
	}

	private setUpdateState(state: UpdateState) {
		this._updateState = state;
		this._windowService.windows.forEach((window) => {
			window.browserWindow.webContents.send(
				IpcChannel.UpdateState,
				this.updateState,
				this._updateInformation?.version,
			);
		});
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(() => resolve(), ms));
	}
}
