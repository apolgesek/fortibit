import { ChildProcess, fork, Serializable } from 'child_process';
import { app, safeStorage } from 'electron';
import { join } from 'path';
import { ProcessArgument } from '../../process-argument.enum';
import { IEncryptionEventWrapper } from './encryption-event-wrapper.model';

export class EncryptionEventWrapper implements IEncryptionEventWrapper {
  private readonly _isDevMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve));

  public async processEventAsync(event: any, encryptedKey: string): Promise<Serializable> {
    const process = await this.createEncryptionProcess(encryptedKey);
    process.send({ ...event });

    return new Promise((resolve) => {
      process.once('message', (result) => {
        resolve(result);
      });
    });
  }

  public async createEncryptionProcess(encryptedKey: string): Promise<ChildProcess> {
    const encryptionProcessPath = join(global['__basedir'], 'main', 'services', 'encryption', 'main.js');
    return fork(encryptionProcessPath, [], {
      silent: !this._isDevMode,
      env: {
        ELECTRON_RUN_AS_NODE: '1',
        ENCRYPTION_KEY: this.decryptKey(encryptedKey)
      }
    });
  }

  private decryptKey(key: string): string {
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(key, 'base64')) : key;
  }
}