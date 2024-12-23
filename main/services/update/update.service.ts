import { IpcChannel, UpdateState } from '@shared-renderer/index';
import { createHash } from 'crypto';
import { app } from 'electron';
import {
	createReadStream,
	emptyDirSync,
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
} from 'fs-extra';
import { zipObject } from 'lodash';
import { arch, platform } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { UpdateInformation } from '../../types/update-information';
import { IConfigService } from '../config/config-service.model';
import { IFileService } from '../file/file-service.model';
import { INativeApiService } from '../native/native-api.model';
import { IWindowService } from '../window/window-service.model';
import { ICommandHandler } from './command-handler.model';
import { IUpdateService } from './update-service.model';

async function computeHash(filePath: string) {
	const input = createReadStream(filePath);
	const hash = createHash('sha256');

	await pipeline(input, hash);

	return hash.digest('hex');
}

type UpdateMetadata = {
	version: string;
	checksum: string;
	download_url: Record<'win32' | 'darwin', string>;
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
	}

	public get updateState(): UpdateState {
		return this._updateState;
	}

	public get updateInformation(): UpdateInformation {
		return this._updateInformation;
	}

	async checkForUpdates(): Promise<boolean> {
		if (!existsSync(this.updateDirectory)) {
			mkdirSync(this.updateDirectory, { recursive: true });
		}

		if (
			this.updateState === UpdateState.Available ||
			this.updateState === UpdateState.Downloaded
		) {
			// reannounce update status
			this.setUpdateState(this.updateState);
			return true;
		}

		const response = await fetch(this._configService.appConfig.updateUrl, {
			method: 'GET',
			cache: 'no-store',
		});

		if (response.status >= 300)
			throw new Error(`Failed to fetch update metadata: ${response.status}`);

		const updateMetadata: UpdateMetadata = await response.json();

		const isUpdateAvailable =
			updateMetadata.version.localeCompare(app.getVersion()) === 1;

		if (isUpdateAvailable) {
			this.resolveUpdateInformation(updateMetadata);
			this.setUpdateState(UpdateState.Available);

			const isAnyValidUpdateFile = await this.isAnyValidUpdateFile();
			if (!isAnyValidUpdateFile) {
				this.getUpdate();
			}
		} else {
			this.setUpdateState(UpdateState.NotAvailable);
		}

		return isUpdateAvailable;
	}

	public isNewUpdateAvailable(): boolean {
		return Boolean(this._updateInformation);
	}

	async updateAndRelaunch(): Promise<void> {
		this._windowService.windows.forEach((window) => {
			window.browserWindow.hide();
		});

		this.spawnUpdateProcess();
	}

	public setUpdateState(state: UpdateState) {
		this._updateState = state;
		this._windowService.windows.forEach((window) => {
			window.browserWindow.webContents.send(
				IpcChannel.UpdateState,
				this.updateState,
				this._updateInformation?.version,
			);
		});
	}

	private async isFileVerified(filePath: string): Promise<boolean> {
		const computedHash = await computeHash(filePath);
		const isMatchingChecksum =
			this._updateInformation.checksum.toUpperCase() ===
			computedHash.toUpperCase();

		return (
			isMatchingChecksum &&
			this._nativeApiService.verifySignature(
				filePath,
				this._configService.appConfig.signatureSubject,
			)
		);
	}

	private async isAnyValidUpdateFile(): Promise<boolean> {
		const updateFileNames = readdirSync(this.updateDirectory);
		const verifyResults = await Promise.all(
			updateFileNames.map((filePath) =>
				this.isFileVerified(join(this.updateDirectory, filePath)),
			),
		);

		const zipped = zipObject(updateFileNames, verifyResults);

		if (
			updateFileNames.some(
				(fileName) => fileName === this._executablePath && zipped[fileName],
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

			setTimeout(async () => {
				const isAnyValidUpdateFile = await this.isAnyValidUpdateFile();
				if (!isAnyValidUpdateFile) {
					this.setUpdateState(UpdateState.FileCorrupted);
				}
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

	private resolveUpdateInformation(updateMetadata: UpdateMetadata) {
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
		this._updateInformation.url = updateMetadata.download_url[platform()];
		this._updateInformation.checksum = updateMetadata.checksum;
		this._updateDestinationPath = join(
			this.updateDirectory,
			this._updateInformation.fileName,
		);
		this._executablePath = this.getExecutablePath(
			this._updateInformation.fileName,
		);
	}
}
