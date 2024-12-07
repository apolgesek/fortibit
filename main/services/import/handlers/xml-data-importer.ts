import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs-extra';
import { PasswordEntry, ImportHandler } from '../../../../shared';
import { IEncryptionEventWrapper, MessageEventType } from '../../encryption';
import { IImportHandler } from '../import-handler.model';
import { ImportMetadata } from './import-metadata.model';

export abstract class XmlDataImporter<T> implements IImportHandler {
	public readonly fileExtension = 'xml';
	protected abstract readonly handlerType: ImportHandler;
	protected abstract readonly mapFn: (data: T[]) => Partial<PasswordEntry>[];

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {}

	async getMetadata(
		fileData: Electron.OpenDialogReturnValue,
	): Promise<ImportMetadata> {
		return new Promise((resolve, reject) => {
			const xmlFile = readFileSync(fileData.filePaths[0]).toString();
			const parser = new XMLParser();

			try {
				const data = parser.parse(xmlFile);
				const output = this.mapFn(data);

				const payload = {
					filePath: fileData.filePaths[0],
					size: output.length,
					type: this.handlerType,
				};

				resolve(payload);
			} catch {
				reject('There was an error importing file');
			}
		});
	}

	async import(key: string, path: string): Promise<string> {
		const xmlFile = readFileSync(path).toString();
		const parser = new XMLParser();

		let output: Partial<PasswordEntry>[] = [];
		try {
			const data = parser.parse(xmlFile);
			output = this.mapFn(data);
		} catch {
			return Promise.reject('There was an error importing file');
		}

		let encryptedOutput;

		try {
			encryptedOutput = await Promise.all(
				output.map(async (e) => {
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
			return Promise.reject('Encryption error occured');
		}

		const serialized = JSON.stringify(encryptedOutput);
		return Promise.resolve(serialized);
	}
}
