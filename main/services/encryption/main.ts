import { createHash } from 'crypto';
import { LeakService } from '../leak/leak.service';
import { IEncryptionService } from './encryption-service.model';
import { EncryptionService } from './encryption.service';
import { InMemoryEncryptionService } from './in-memory-encryption.service';
import { MessageEventType } from './message-event-type.enum';

type EventPayload = { [key: string]: string };

class Main {
  private readonly _encryptionService: IEncryptionService;
  private readonly _inMemoryEncryptionService: IEncryptionService;
  private readonly _leakService: LeakService;
  private readonly _messageListener: () => void;

  constructor() {
    this._encryptionService = new EncryptionService();
    this._inMemoryEncryptionService = new InMemoryEncryptionService();
    this._leakService = new LeakService();

    this._messageListener = this.execute.bind(this);
  }

  public setup(): NodeJS.Process {
    return process.on('message', this._messageListener);
  }

  public execute(event): void {
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

    case MessageEventType.GetLeaks:
      this.getLeaks(event);
      break;

    default:
      break;
    }  

    process.off('message', this._messageListener);
  }

  public encryptDatabase(event: EventPayload) {
    const { database, newPassword, memoryKey } = event;

    const parsedDb = JSON.parse(database);
    const stores = parsedDb.data.data;

    const entriesStore = stores.find(x => x.tableName === 'entries');
    const historyStore = stores.find(x => x.tableName === 'history');

    entriesStore.rows = entriesStore.rows.map(entry => ({
      ...entry,
      password: this._inMemoryEncryptionService.decryptString(entry.password, memoryKey)
    }));

    historyStore.rows = historyStore.rows.map(item => {
      item.entry.password = this._inMemoryEncryptionService.decryptString(item.entry.password, memoryKey);

      return item;
    });
    
    const databaseJSON = JSON.stringify(parsedDb);

    process.send({ encrypted: this._encryptionService.encryptString(databaseJSON, newPassword) });
  }

  public decryptDatabase(event: EventPayload) {
    const { fileData, password, memoryKey } = event;
  
    try {
      const decryptedDb = JSON.parse(this._encryptionService.decryptString(fileData, password));
      const stores = decryptedDb.data.data;

      const entriesStore = stores.find(x => x.tableName === 'entries');
      const historyStore = stores.find(x => x.tableName === 'history');

      entriesStore.rows = entriesStore.rows.map(entry => ({
        ...entry,
        password: this._inMemoryEncryptionService.encryptString(entry.password, memoryKey)
      }));

      historyStore.rows = historyStore.rows.map(item => {
        item.entry.password = this._inMemoryEncryptionService.encryptString(item.entry.password, memoryKey);

        return item;
      });

      process.send({ decrypted: JSON.stringify(decryptedDb) });
    } catch (err) {
      process.send({ error: err });
    }
  }

  public async getLeaks(event: EventPayload) {
    const { database, memoryKey } = event;
  
    try {
      const parsedDb = JSON.parse(database);
      const stores = parsedDb.data.data;
      const entriesStore = stores.find(x => x.tableName === 'entries');

      const entries = entriesStore.rows.map(e => {
        const shasum = createHash('sha1');
        shasum.update(this._inMemoryEncryptionService.decryptString(e.password, memoryKey));
        const hash = shasum.digest('hex');

        return {
          id: e.id,
          hash: hash
        };
      });

      const leaks = await this._leakService.findLeaks(entries);

      process.send({ data: JSON.stringify(leaks) });
    } catch (err) {
      process.send({ error: err });
    }
  }

  public encryptString(event: EventPayload) {
    const { plain, memoryKey } = event;

    const encryptedPassword = this._inMemoryEncryptionService.encryptString(plain, memoryKey);
    process.send({ encrypted: encryptedPassword });
  }

  public decryptString(event: EventPayload) {
    const { encrypted, memoryKey } = event;

    const decryptedPassword = this._inMemoryEncryptionService.decryptString(encrypted, memoryKey);
    process.send({ decrypted: decryptedPassword });
  }
}

new Main().setup();