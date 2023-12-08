import { createHash } from 'crypto';
import { PasswordEntry, VaultSchema } from '../../../shared';
import { IExposedPasswordsService } from '../exposed-passwords/exposed-passwords-service.model';
import { ExposedPasswordsService } from '../exposed-passwords/exposed-passwords.service';
import { MockExposedPasswordsService } from '../exposed-passwords/mock-exposed-passwords.service';
import { WeakPasswordsService } from '../weak-passwords/weak-passwords.service';
import { IEncryptionService } from './encryption-service.model';
import { EncryptionService } from './encryption.service';
import { InMemoryEncryptionService } from './in-memory-encryption.service';
import { MessageEventType } from './message-event-type.enum';

type EventPayload = {
  type: MessageEventType;
  [key: string]: any;
};

// include only intended props excluding database engine generated and private ones
function normalizeEntity<T extends object>(e: T): Partial<T> {
  const entity: Partial<T> = {};
  for (const key in e) {
    if (Object.prototype.hasOwnProperty.call(e, key) && /^[0-9a-z].*/i.test(key)) {
      entity[key] = e[key];
    }
  }

  return entity;
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
    this._exposedPasswordsService = process.env.TEST_MODE === '0'
      ? new ExposedPasswordsService()
      : new MockExposedPasswordsService();
    this._weakPasswordsService = new WeakPasswordsService();

    this._messageListener = this.execute.bind(this);
  }

  public setup(): NodeJS.Process {
    return process.once('message', this._messageListener);
  }

  public async execute(event: EventPayload): Promise<void> {
    switch (event.type) {
    case MessageEventType.DecryptDatabase:
      this.decryptDatabase(event);
      break;

    case MessageEventType.EncryptDatabase:
      this.encryptDatabase(event);
      break;

    case MessageEventType.EncryptString:
      this.encryptString(event);
      break;

    case MessageEventType.DecryptString:
      this.decryptString(event);
      break;

    case MessageEventType.BulkDecryptString:
      this.bulkDecryptString(event);
      break;

    case MessageEventType.GetLeaks:
      await this.getLeaks(event);
      break;

    case MessageEventType.GetWeakPasswords:
      await this.getWeakPasswords(event);
      break;

    default:
      break;
    }

    // explicitly exit the process just in case
    process.exit();
  }

  public encryptDatabase(event: EventPayload) {
    const { schemaVersion, database, password } = event;
    const parsedDb = JSON.parse(database);
    const stores = parsedDb.data.data;

    const entriesStore = stores.find(x => x.tableName === 'entries');
    const historyStore = stores.find(x => x.tableName === 'history');
    const groupsStore = stores.find(x => x.tableName === 'groups');
    const reportsStore = stores.find(x => x.tableName === 'reports');

    entriesStore.rows = entriesStore.rows.map(entry => ({
      ...entry,
      password: this._inMemoryEncryptionService.decryptString(entry.password, process.env.ENCRYPTION_KEY)
    }));

    historyStore.rows = historyStore.rows.map(item => {
      item.entry.password = this._inMemoryEncryptionService.decryptString(item.entry.password, process.env.ENCRYPTION_KEY);
      return item;
    });

    const vault: VaultSchema = {
      schemaVersion: schemaVersion,
      tables: {
        entries: entriesStore.rows.map(normalizeEntity),
        groups: groupsStore.rows.map(normalizeEntity),
        history: historyStore.rows.map(normalizeEntity),
        reports: reportsStore.rows.map(normalizeEntity)
      }
    };
    
    const databaseJSON = JSON.stringify(vault);
    process.send({ encrypted: this._encryptionService.encryptString(databaseJSON, password) });
  }

  public decryptDatabase(event: EventPayload) {
    const { data, password } = event;
  
    try {
      const stringifiedDb = this._encryptionService.decryptString(data, password);
      const decryptedDb = JSON.parse(stringifiedDb);

      decryptedDb.tables.entries = decryptedDb.tables.entries.map(entry => ({
        ...entry,
        password: this._inMemoryEncryptionService.encryptString(entry.password, process.env.ENCRYPTION_KEY)
      }));

      decryptedDb.tables.history = decryptedDb.tables.history.map(item => {
        item.entry.password = this._inMemoryEncryptionService.encryptString(item.entry.password, process.env.ENCRYPTION_KEY);
        return item;
      });

      process.send({ decrypted: JSON.stringify(decryptedDb) });
    } catch (err) {
      console.log(err);
      process.send({ error: err });
    }
  }

  public async getLeaks(event: EventPayload) {
    const { database } = event;
  
    try {
      const parsedDb = JSON.parse(database);
      const stores = parsedDb.data.data;
      const entriesStore = stores.find(x => x.tableName === 'entries');
      const entries = entriesStore.rows.map(entry => {
        const shasum = createHash('sha1');
        shasum.update(this._inMemoryEncryptionService.decryptString(entry.password, process.env.ENCRYPTION_KEY));
        const hash = shasum.digest('hex');
        
        return {
          id: entry.id,
          hash: hash
        };
      });

      const leaks = await this._exposedPasswordsService.findLeaks(entries, process.env.BASEDIR);
      process.send({ data: JSON.stringify(leaks) });
    } catch (err) {
      process.send({ error: err });
    }
  }

  public async getWeakPasswords(event: EventPayload) {
    const { database } = event;
  
    try {
      const parsedDb = JSON.parse(database);
      const stores = parsedDb.data.data;
      const entriesStore = stores.find(x => x.tableName === 'entries');
      const entries = entriesStore.rows.map(entry => {
        return {
          id: entry.id,
          password: this._inMemoryEncryptionService.decryptString(entry.password, process.env.ENCRYPTION_KEY)
        };
      });

      const weakPasswords = await this._weakPasswordsService.getAll(entries);
      process.send({ data: JSON.stringify(weakPasswords) });
    } catch (err) {
      process.send({ error: err });
    }
  }

  public encryptString(event: EventPayload) {
    const { plain } = event;
    const encryptedPassword = this._inMemoryEncryptionService.encryptString(plain, process.env.ENCRYPTION_KEY);
    process.send({ encrypted: encryptedPassword });
  }

  public decryptString(event: EventPayload) {
    const { encrypted } = event;
    const decryptedPassword = this._inMemoryEncryptionService.decryptString(encrypted, process.env.ENCRYPTION_KEY);
    process.send({ decrypted: decryptedPassword });
  }

  public bulkDecryptString(event: EventPayload) {
    const { rows } = event;
    let decrypted: PasswordEntry[] = JSON.parse(rows);
    decrypted = decrypted.map(x => ({ ...x, password: this._inMemoryEncryptionService.decryptString(x.password, process.env.ENCRYPTION_KEY) }));
    process.send({ decrypted });
  }
}

new Main().setup();