import { Encryptor } from './encryptor';
import { SimpleEncryptor } from './simple-encryptor';
import { MessageEventType } from './message-event-type.enum';

class Main {
  public static setup(): void {
    process.on('message', Main.execute);
  }

  public static execute(event): void {
    switch (event.type) {
    case MessageEventType.DecryptDatabase:
      Main.decryptDatabase(event);
      break;

    case MessageEventType.EncryptDatabase:
      Main.encryptDatabase(event);
      break;

    default:
      break;
    }
  
    process.off('message', Main.execute);
  }

  public static encryptDatabase(event) {
    const { database, newPassword, memoryKey } = event;

    const parsed = JSON.parse(database);
    parsed.entries = parsed.entries.map(e => ({
      ...e,
      password: SimpleEncryptor.decryptString(e.password, memoryKey)
    }));
    
    const databaseJSON = JSON.stringify(parsed);
    process.send(Encryptor.encryptString(databaseJSON, newPassword));
  }

  public static decryptDatabase(event) {
    const { fileData, password, memoryKey } = event;
  
    try {
      const decrypted = JSON.parse(Encryptor.decryptString(fileData, password));
      decrypted.entries = decrypted.entries.map(e => ({
        ...e,
        password: SimpleEncryptor.encryptString(e.password, memoryKey)
      }));

      process.send({ decrypted: JSON.stringify(decrypted) });
    } catch (err) {
      process.send({ error: err });
    }
  }
}

Main.setup();