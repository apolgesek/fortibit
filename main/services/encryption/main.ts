import { MessageEventType } from './message-event-type.enum';
import { EncryptionService } from './encryption.service';
import { InMemoryEncryptionService } from './in-memory-encryption.service';
import { IEncryptionService } from './encryption-service.model';

class Main {
  private readonly _encryptionService: IEncryptionService;
  private readonly _inMemoryEncryptionService: IEncryptionService;
  private readonly _messageListener: () => void;

  constructor() {
    this._encryptionService = new EncryptionService();
    this._inMemoryEncryptionService = new InMemoryEncryptionService();

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

    default:
      break;
    }
  
    process.off('message', this._messageListener);
  }

  public encryptDatabase(event) {
    const { database, newPassword, memoryKey } = event;

    const parsedDb = JSON.parse(database);
    parsedDb.entries = parsedDb.entries.map(e => ({
      ...e,
      password: this._inMemoryEncryptionService.decryptString(e.password, memoryKey)
    }));
    
    const databaseJSON = JSON.stringify(parsedDb);
    process.send({ encrypted: this._encryptionService.encryptString(databaseJSON, newPassword) });
  }

  public decryptDatabase(event) {
    const { fileData, password, memoryKey } = event;
  
    try {
      const decryptedDb = JSON.parse(this._encryptionService.decryptString(fileData, password));
      decryptedDb.entries = decryptedDb.entries.map(entry => ({
        ...entry,
        password: this._inMemoryEncryptionService.encryptString(entry.password, memoryKey)
      }));

      process.send({ decrypted: JSON.stringify(decryptedDb) });
    } catch (err) {
      process.send({ error: err });
    }
  }

  public encryptString(event) {
    const { plain, memoryKey } = event;

    const encryptedPassword = this._inMemoryEncryptionService.encryptString(plain, memoryKey);
    process.send({ encrypted: encryptedPassword });
  }

  public decryptString(event) {
    const { encrypted, memoryKey } = event;

    const decryptedPassword = this._inMemoryEncryptionService.decryptString(encrypted, memoryKey);
    process.send({ decrypted: decryptedPassword });
  }
}

new Main().setup();