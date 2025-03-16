import { createHash } from 'crypto';
import { bootstrap } from 'global-agent';
import { Entry, VaultSchema } from '../../../shared';
import { IEncryptionService } from './encryption-service.model';
import { EncryptionService } from './encryption.service';
import {
	BulkDecryptStringEventPayload,
	DecryptDatabaseEventPayload,
	DecryptStringEventPayload,
	EncryptDatabaseEventPayload,
	EncryptStringEventPayload,
	EventPayload,
	GetLeaksEventPayload,
	GetWeakPasswordsEventPayload,
} from './events/event-payload.type';
import { IExposedPasswordsService } from './exposed-passwords/exposed-passwords-service.model';
import { ExposedPasswordsService } from './exposed-passwords/exposed-passwords.service';
import { InMemoryEncryptionService } from './in-memory-encryption.service';
import { MessageEventType } from './message-event-type.enum';
import { WeakPasswordsService } from './weak-passwords/weak-passwords.service';

if (process.env.PROXY_ENABLED === '1') {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:8080';

	bootstrap();
}

// include only intended props excluding database engine generated and private ones
function normalizeEntity<T extends object>(e: T): Partial<T> {
	const entity: Partial<T> = {};
	for (const key in e) {
		if (
			Object.prototype.hasOwnProperty.call(e, key) &&
			/^[0-9a-z].*/i.test(key)
		) {
			entity[key] = e[key];
		}
	}

	return entity;
}

function sendAsync<T>(arg: T): Promise<void> {
	return new Promise((resolve) => {
		process.send!(arg, resolve);
	});
}

class Main {
	private readonly _encryptionService: IEncryptionService;
	private readonly _inMemoryEncryptionService: IEncryptionService;
	private readonly _exposedPasswordsService: IExposedPasswordsService;
	private readonly _weakPasswordsService: WeakPasswordsService;
	private readonly _messageListener: () => void;

	constructor() {
		this._encryptionService = new EncryptionService();
		this._inMemoryEncryptionService = new InMemoryEncryptionService();
		this._exposedPasswordsService = new ExposedPasswordsService();
		this._weakPasswordsService = new WeakPasswordsService();

		this._messageListener = this.execute.bind(this);
	}

	public setup(): NodeJS.Process {
		return process.once('message', this._messageListener);
	}

	public async execute(event: EventPayload): Promise<void> {
		const eventMap = {
			[MessageEventType.DecryptDatabase]: this.decryptDatabase,
			[MessageEventType.EncryptDatabase]: this.encryptDatabase,
			[MessageEventType.EncryptString]: this.encryptString,
			[MessageEventType.DecryptString]: this.decryptString,
			[MessageEventType.BulkDecryptString]: this.bulkDecryptString,
			[MessageEventType.GetLeaks]: this.getLeaks,
			[MessageEventType.GetWeakPasswords]: this.getWeakPasswords,
		};

		const fn = eventMap[event.type];
		if (!fn) {
			throw new Error(`Unknown event type: ${event.type}`);
		}

		await fn.bind(this)(event);

		// explicitly exit the process just in case
		process.exit();
	}

	public async encryptDatabase(event: EncryptDatabaseEventPayload) {
		const { schemaVersion, database, password } = event;
		const parsedDb = JSON.parse(database);
		const stores = parsedDb.data.data;

		const entriesStore = stores.find((x) => x.tableName === 'entries');
		const historyStore = stores.find((x) => x.tableName === 'history');
		const groupsStore = stores.find((x) => x.tableName === 'groups');
		const reportsStore = stores.find((x) => x.tableName === 'reports');
		const configStore = stores.find((x) => x.tableName === 'config');

		for (const entry of entriesStore.rows) {
			switch (entry.type) {
				case 'password':
					entry.password = this._inMemoryEncryptionService.decryptString(
						entry.password,
						process.env.ENCRYPTION_KEY as string,
					);
					break;
				default:
					break;
			}
		}

		for (const historyEntry of historyStore.rows) {
			switch (historyEntry.entry.type) {
				case 'password':
					historyEntry.entry.password =
						this._inMemoryEncryptionService.decryptString(
							historyEntry.entry.password,
							process.env.ENCRYPTION_KEY as string,
						);
					break;
				default:
					break;
			}
		}

		const vault: VaultSchema = {
			schemaVersion: schemaVersion,
			tables: {
				entries: entriesStore.rows.map(normalizeEntity),
				groups: groupsStore.rows.map(normalizeEntity),
				history: historyStore.rows.map(normalizeEntity),
				reports: reportsStore.rows.map(normalizeEntity),
				config: configStore.rows.map(normalizeEntity),
			},
		};

		const databaseJSON = JSON.stringify(vault);
		await sendAsync({
			encrypted: this._encryptionService.encryptString(databaseJSON, password),
		});
	}

	public async decryptDatabase(event: DecryptDatabaseEventPayload) {
		const { data, password } = event;

		try {
			const stringifiedDb = this._encryptionService.decryptString(
				data,
				password,
			);
			const decryptedDb = JSON.parse(stringifiedDb);

			for (const entry of decryptedDb.tables.entries) {
				switch (entry.type) {
					case 'password':
						entry.password = this._inMemoryEncryptionService.encryptString(
							entry.password,
							process.env.ENCRYPTION_KEY as string,
						);
						break;
					default:
						break;
				}
			}

			for (const historyEntry of decryptedDb.tables.history) {
				switch (historyEntry.entry.type) {
					case 'password':
						historyEntry.entry.password =
							this._inMemoryEncryptionService.encryptString(
								historyEntry.entry.password,
								process.env.ENCRYPTION_KEY as string,
							);
						break;
					default:
						break;
				}
			}

			await sendAsync({ decrypted: JSON.stringify(decryptedDb) });
		} catch (err) {
			console.log(err);
			await sendAsync({ error: err });
		}
	}

	public async encryptString(event: EncryptStringEventPayload) {
		const { plain } = event;
		const encryptedPassword = this._inMemoryEncryptionService.encryptString(
			plain,
			process.env.ENCRYPTION_KEY as string,
		);

		await sendAsync({ encrypted: encryptedPassword });
	}

	public async decryptString(event: DecryptStringEventPayload) {
		const { encrypted } = event;
		const decryptedPassword = this._inMemoryEncryptionService.decryptString(
			encrypted,
			process.env.ENCRYPTION_KEY as string,
		);

		await sendAsync({ decrypted: decryptedPassword });
	}

	public async bulkDecryptString(event: BulkDecryptStringEventPayload) {
		const { rows } = event;
		const decrypted: Entry[] = JSON.parse(rows);

		for (const entry of decrypted) {
			switch (entry.type) {
				case 'password':
					entry.password = this._inMemoryEncryptionService.decryptString(
						entry.password,
						process.env.ENCRYPTION_KEY as string,
					);
					break;
				default:
					break;
			}
		}

		await sendAsync({ decrypted });
	}

	public async getLeaks(event: GetLeaksEventPayload) {
		const { database } = event;

		try {
			const parsedDb = JSON.parse(database);
			const stores = parsedDb.data.data;
			const entriesStore = stores.find((x) => x.tableName === 'entries');
			const entries = entriesStore.rows
				.filter((x) => x.type === 'password')
				.map((entry) => {
					const shasum = createHash('sha1');
					shasum.update(
						this._inMemoryEncryptionService.decryptString(
							entry.password,
							process.env.ENCRYPTION_KEY as string,
						),
					);
					const hash = shasum.digest('hex');

					return {
						id: entry.id,
						hash: hash,
					};
				});

			const leaks = await this._exposedPasswordsService.findLeaks(
				entries,
				process.env.LEAKED_PASSWORDS_API_URL as string,
			);

			await sendAsync({ data: JSON.stringify(leaks) });
		} catch (err) {
			await sendAsync({ error: err });
		}
	}

	public async getWeakPasswords(event: GetWeakPasswordsEventPayload) {
		const { database } = event;

		try {
			const parsedDb = JSON.parse(database);
			const stores = parsedDb.data.data;
			const entriesStore = stores.find((x) => x.tableName === 'entries');
			const entries = entriesStore.rows
				.filter((x) => x.type === 'password')
				.map((entry) => {
					return {
						id: entry.id,
						password: this._inMemoryEncryptionService.decryptString(
							entry.password,
							process.env.ENCRYPTION_KEY as string,
						),
					};
				});

			const weakPasswords = await this._weakPasswordsService.getAll(entries);
			await sendAsync({ data: JSON.stringify(weakPasswords) });
		} catch (err) {
			console.log(err);
			await sendAsync({ error: err });
		}
	}
}

new Main().setup();
