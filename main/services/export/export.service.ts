import { CsvWriter } from '@root/main/util';
import { PasswordEntry } from '../../../shared';
import { IEncryptionEventWrapper, MessageEventType } from '../encryption';
import { IExportService } from './export-service.model';

export class ExportService implements IExportService {
	constructor(
		@IEncryptionEventWrapper
		private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {}

	async export(key: string, path: string, database: string): Promise<boolean> {
		const parsedDb = JSON.parse(database);
		const stores = parsedDb.data.data;
		const entriesStore = stores.find((x) => x.tableName === 'entries');

		const encryptionEvent = {
			rows: JSON.stringify(entriesStore.rows),
			type: MessageEventType.BulkDecryptString,
		};

		const payload = (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			key,
		)) as { error: string; decrypted: PasswordEntry[] };

		CsvWriter.writeFile(path, payload.decrypted, [
			'title',
			'username',
			'password',
			'url',
			'notes',
		]);

		return true;
	}
}
