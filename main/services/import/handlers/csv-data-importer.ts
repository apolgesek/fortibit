import { getDefaultPath, getFileFilter } from '@root/main/util';
import * as csv from 'csv-parser';
import { dialog } from 'electron';
import { createReadStream } from 'fs-extra';
import { PasswordEntry, ImportHandler } from '../../../../shared';
import { IConfigService } from '../../config';
import { IEncryptionEventWrapper, MessageEventType } from '../../encryption';
import { IWindowService } from '../../window';
import { IImportHandler } from '../import-handler.model';
import { ImportMetadata } from './import-metadata.model';

export abstract class CsvDataImporter<T> implements IImportHandler {
	protected abstract readonly handlerType: ImportHandler;
	protected abstract readonly mock: T;
	protected abstract readonly mapFn: (result: T[]) => Partial<PasswordEntry>[];

	constructor(
		protected readonly _windowService: IWindowService,
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
		protected readonly _configService: IConfigService,
	) {}

	async getMetadata(): Promise<ImportMetadata> {
		const fileObj = await dialog.showOpenDialog({
			properties: ['openFile'],
			defaultPath: getDefaultPath(this._configService.appConfig, ''),
			filters: [getFileFilter(this._configService.appConfig, 'csv')],
		});

		if (fileObj.canceled) {
			return;
		}

		return new Promise((resolve, reject) => {
			const results: T[] = [];

			createReadStream(fileObj.filePaths[0])
				.pipe(csv())
				.on('headers', (headers) => {
					if (
						!this.validateKeys(Object.keys(this.mock) as (keyof T)[], headers)
					) {
						reject('The was an error importing file');
						return;
					}
				})
				.on('data', (data) => results.push(data))
				.on('error', (err) => reject(err))
				.on('end', () => {
					const payload = {
						filePath: fileObj.filePaths[0],
						size: results.length,
						type: this.handlerType,
					};

					resolve(payload);
					return;
				});
		});
	}

	import(event: Electron.IpcMainEvent, path: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let results: T[] = [];
			let output: Partial<PasswordEntry>[] = [];

			createReadStream(path)
				.pipe(csv())
				.on('data', (data) => results.push(data))
				.on('error', (err) => reject(err))
				.on('end', async () => {
					const isValid = results.every((x) => this.validateTypes(x));

					if (!isValid) {
						reject('The was an error importing file');
						return;
					}

					output = this.mapFn(results);
					let encryptedOutput;

					try {
						encryptedOutput = await Promise.all(
							output.map(async (e) => {
								const encryptionEvent = {
									plain: e.password,
									type: MessageEventType.EncryptString,
								};

								const window = this._windowService.getWindowByWebContentsId(
									event.sender.id,
								);
								const password =
									(await this._encryptionEventWrapper.processEventAsync(
										encryptionEvent,
										window.key,
									)) as { encrypted: string };

								return {
									...e,
									password: password.encrypted,
								};
							}),
						);
					} catch (err) {
						reject('Encryption error occured');
					}

					const serialized = JSON.stringify(encryptedOutput);
					resolve(serialized);
				});
		});
	}

	protected validateKeys(expectedHeaders: (keyof T)[], value: string[]) {
		const uniqueHeaders = Array.from(new Set(value));

		return (
			uniqueHeaders.length === expectedHeaders.length &&
			expectedHeaders.every(
				(eh) => uniqueHeaders.findIndex((h) => h === eh) > -1,
			)
		);
	}

	protected validateTypes(object: T): boolean {
		for (const key in object) {
			if (Object.prototype.hasOwnProperty.call(object, key)) {
				const element = object[key];
				if (typeof element !== typeof this.mock[key]) {
					if (
						typeof this.mock[key] === 'number' &&
						Number.isInteger(parseInt(element as unknown as string))
					) {
						continue;
					}

					return false;
				}
			}
		}

		return true;
	}
}
