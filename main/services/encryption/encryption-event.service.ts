import { IEncryptionEventWrapper } from '../encryption/encryption-event-wrapper.model';
import { IEncryptionEventService } from './encryption-event-service.model';
import { GetLeaksEvent } from './events/get-leaks-event.model';
import { MessageEventType } from './message-event-type.enum';

export class EncryptionEventService implements IEncryptionEventService {
	constructor(
		@IEncryptionEventWrapper
		private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {}

	public async getLeaks(
		database: string,
		key: string,
	): Promise<{ data: string | false; error: string }> {
		const encryptionEvent: GetLeaksEvent = {
			database,
			type: MessageEventType.GetLeaks,
		};
		return (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			key,
		)) as { error: string; data: string };
	}

	public async getWeakPasswords(
		database: string,
		key: string,
	): Promise<{ data: string | false; error: string }> {
		const encryptionEvent = {
			database,
			type: MessageEventType.GetWeakPasswords,
		};
		return (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			key,
		)) as { error: string; data: string };
	}

	public async saveDatabase(
		schemaVersion: number,
		database: string,
		password: string,
		key: string,
	): Promise<{ encrypted: string }> {
		const encryptionEvent = {
			schemaVersion,
			database,
			password,
			type: MessageEventType.EncryptDatabase,
		};
		return (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			key,
		)) as { encrypted: string };
	}

	public async decryptDatabase(
		data: string,
		password: string,
		key: string,
	): Promise<{ error: string; decrypted: string }> {
		const encryptionEvent = {
			data,
			password,
			type: MessageEventType.DecryptDatabase,
		};
		return (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			key,
		)) as { error: string; decrypted: string };
	}
}
