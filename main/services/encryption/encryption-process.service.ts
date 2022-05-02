import { ChildProcess, fork, Serializable } from 'child_process';
import { app, safeStorage } from 'electron';
import { join } from 'path';
import { ProcessArgument } from '../../process-argument.enum';
import { IEncryptionProcessService } from './encryption-process-service.model';

export class EncryptionProcessService implements IEncryptionProcessService {
  private readonly _isDevMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve));

  public async processEventAsync(event): Promise<Serializable> {
    const process = await this.createEncryptionProcess();
    process.send({...event, memoryKey: this.getMemoryKey(global['__memKey']) });

    return new Promise((resolve) => {
      process.once('message', (result) => {
        resolve(result);
      });
    });
  }

  public async createEncryptionProcess(): Promise<ChildProcess> {
    const encryptionProcessPath = join(global['__basedir'], 'main', 'services', 'encryption', 'main.js');

    return fork(encryptionProcessPath, [], {
      silent: !this._isDevMode,
      env: {
        ELECTRON_RUN_AS_NODE: '1',
      }
    });
  }

  private getMemoryKey(key: Buffer | string): string {
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(key as Buffer) : key as string;
  }
}