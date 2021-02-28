import { Encryptor } from './encryptor';
import { SimpleEncryptor } from './simple-encryptor';

class Main {
  public static setup(): void {
    process.on('message', Main.execute);
  }

  public static execute(event): void {
    if (event.type === 'dbDecrypt') {
      const {fileData, password, memKey} = event;
  
      try {
        const decrypted = JSON.parse(Encryptor.decryptString(fileData, password));
        Main.encryptPasswords(decrypted[0], memKey);
        process.send({ decrypted });
      } catch (err) {
        process.send({ error: err });
      }
    } else if (event.type === 'dbEncrypt') {
      const { database, newPassword, memKey } = event;
  
      Main.decryptPasswords(database[0], memKey);
      const databaseJSON = JSON.stringify(database);
  
      process.send(Encryptor.encryptString(databaseJSON, newPassword));
    }
  
    process.off('message', Main.execute);
  }

  private static encryptPasswords(node, key: string): void {
    if (node.data?.length) {
      node.data.forEach(entry => {
        entry.password = SimpleEncryptor.encryptString(entry.password, key);
      });
    }
  
    if (node.children?.length) {
      node.children.forEach(el => {
        return Main.encryptPasswords(el, key);
      });
    }
  }
  
  private static decryptPasswords(node, key: string): void {
    if (node.data?.length) {
      node.data.forEach(entry => {
        entry.password = SimpleEncryptor.decryptString(entry.password, key);
      });
    }
  
    if (node.children?.length) {
      node.children.forEach(el => {
        return Main.encryptPasswords(el, key);
      });
    }
  }
}

Main.setup();