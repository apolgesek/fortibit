import csv from 'csv-parser';
import { createReadStream } from 'fs-extra';
import { ImportHandler, PasswordEntry } from '../../../../shared';
import { IEncryptionEventWrapper, MessageEventType } from '../../encryption';
import { IImportHandler } from '../import-handler.model';
import { ImportMetadata } from './import-metadata.model';

export abstract class CsvDataImporter<T> implements IImportHandler {
	public readonly fileExtension = 'csv';
	protected abstract readonly handlerType: ImportHandler;
	protected abstract readonly mock: T;
	protected abstract readonly mapFn: (result: T[]) => Partial<PasswordEntry>[];

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {}

	async getMetadata(
		fileData: Electron.OpenDialogReturnValue,
	): Promise<ImportMetadata> {
		return new Promise((resolve, reject) => {
			const results: T[] = [];

			createReadStream(fileData.filePaths[0])
				.pipe(csv())
				.on('headers', (headers) => {
					if (
						!this.validateKeys(Object.keys(this.mock) as (keyof T)[], headers)
					) {
						reject('There was an error importing file');
						return;
					}
				})
				.on('data', (data) => results.push(data))
				.on('error', (err) => reject(err))
				.on('end', () => {
					const payload = {
						filePath: fileData.filePaths[0],
						size: results.length,
						type: this.handlerType,
					};

					resolve(payload);
					return;
				});
		});
	}

	import(key: string, path: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const results: T[] = [];
			let entries: Partial<PasswordEntry>[] = [];

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

					entries = this.mapFn(results);
					entries = entries.map((x) => ({ ...x, type: x.type ?? 'password' }));
					let encryptedOutput;

					try {
						encryptedOutput = await Promise.all(
							entries.map(async (e) => {
								const encryptionEvent = {
									plain: e.password,
									type: MessageEventType.EncryptString,
								};

								const password =
									(await this._encryptionEventWrapper.processEventAsync(
										encryptionEvent,
										key,
									)) as { encrypted: string };

								return {
									...e,
									password: password.encrypted,
								};
							}),
						);
					} catch {
						reject('Encryption error occured');
						return;
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
					if (typeof element === 'string' && element.length === 0) continue;

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
