import { dialog } from 'electron';
import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs-extra';
import { IPasswordEntry, ImportHandler } from '../../../../shared';
import { IEncryptionEventWrapper, MessageEventType } from '../../encryption';
import { IWindowService } from '../../window';
import { IImportHandler } from '../import-handler.model';
import { IImportMetadata } from './import-metadata.model';

export abstract class XmlDataImporter implements IImportHandler {
  protected abstract readonly handlerType: ImportHandler;
  protected abstract readonly mapFn: (data: any) => Partial<IPasswordEntry>[];

  constructor(
    protected readonly _windowService: IWindowService,
    protected readonly _encryptionEventWrapper: IEncryptionEventWrapper) {
  }

  async getMetadata(): Promise<IImportMetadata> {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Extensible Markup Language', extensions: ['xml'] }]
    });

    if (fileObj.canceled) {
      return;
    }

    return new Promise((resolve) => {
      const xmlFile = readFileSync(fileObj.filePaths[0]).toString();
      const parser = new XMLParser();
      const data = parser.parse(xmlFile);
      const output = this.mapFn(data);

      const payload = {
        filePath: fileObj.filePaths[0],
        size: output.length,
        type: this.handlerType
      };

      resolve(payload);  
    });
  }

  async import(event: Electron.IpcMainEvent, path: string): Promise<string> {
    const xmlFile = readFileSync(path).toString();
    const parser = new XMLParser();
    const data = parser.parse(xmlFile);
    const output = this.mapFn(data);

    let encryptedOutput;

    try {
      encryptedOutput = await Promise.all(output.map(async (e) => {
        const encryptionEvent = {
          plain: e.password,
          type: MessageEventType.EncryptString
        };
    
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);
        const password = await this._encryptionEventWrapper.processEventAsync(encryptionEvent, window.key) as { encrypted: string };
  
        return {
          ...e,
          password: password.encrypted
        };
      }));
    } catch (err) {
      Promise.reject('Encryption error occured');
    }

    const serialized = JSON.stringify(encryptedOutput);
    return Promise.resolve(serialized);
  }
}