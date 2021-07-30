import { MessageEventType } from './message-event-type.enum';
import { EncryptionService } from './encryption.service';
import { InMemoryEncryptionService } from './in-memory-encryption.service';
import { IEncryptionService } from './encryption-service.model';
class Main {
  private readonly encryptionService: IEncryptionService;
  private readonly inMemoryEncryptionService: IEncryptionService;
  private readonly messageListener: () => void;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.inMemoryEncryptionService = new InMemoryEncryptionService();
    this.messageListener = this.execute.bind(this);
  }

  public setup(): NodeJS.Process {
    return process.on('message', this.messageListener);
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
  
    process.off('message', this.messageListener);
  }

  public encryptDatabase(event) {
    const { database, newPassword, memoryKey } = event;

    const parsed = JSON.parse(database);
    parsed.entries = parsed.entries.map(e => ({
      ...e,
      password: this.inMemoryEncryptionService.decryptString(e.password, memoryKey)
    }));
    
    const databaseJSON = JSON.stringify(parsed);
    process.send(this.encryptionService.encryptString(databaseJSON, newPassword));
  }

  public decryptDatabase(event) {
    const { fileData, password, memoryKey } = event;
  
    try {
      const decrypted = JSON.parse(this.encryptionService.decryptString(fileData, password));
      decrypted.entries = decrypted.entries.map(e => ({
        ...e,
        password: this.inMemoryEncryptionService.encryptString(e.password, memoryKey)
      }));

      process.send({ decrypted: JSON.stringify(decrypted) });
    } catch (err) {
      process.send({ error: err });
    }
  }

  public encryptString(event) {
    const { plain, memoryKey } = event;

    const encryptedPassword = this.inMemoryEncryptionService.encryptString(plain, memoryKey);
    process.send(encryptedPassword);
  }

  public decryptString(event) {
    const { encrypted, memoryKey } = event;

    const decryptedPassword = this.inMemoryEncryptionService.decryptString(encrypted, memoryKey);
    process.send(decryptedPassword);
  }
}

new Main().setup();