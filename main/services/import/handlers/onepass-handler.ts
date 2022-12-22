import * as csv from 'csv-parser';
import { dialog } from "electron";
import { createReadStream } from "fs";
import { ImportHandler } from "../../../../shared-models";
import { IEncryptionEventWrapper, MessageEventType } from '../../encryption';
import { IWindowService } from '../../window';
import { IImportHandler } from "../import-handler.model";
import { IImportMetadata } from "./import-metadata.model";

interface IOnePasswordEntry {
  title: string;
  url: string;
  username: string;
  password: string;
  notes: string;
}

export class OnePassHandler implements IImportHandler {
  constructor(
    private readonly _windowService: IWindowService,
    private readonly _encryptionEventWrapper: IEncryptionEventWrapper
  ) {}

  async getMetadata(): Promise<IImportMetadata> {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Comma Separated Values File', extensions: ['csv'] }]
    });

    if (fileObj.canceled) {
      return;
    }

    return new Promise((resolve, reject) => {
      const results: IOnePasswordEntry[] = [];

      createReadStream(fileObj.filePaths[0])
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('error', (err) => reject(err))
        .on('end', () => {
          const payload = {
            filePath: fileObj.filePaths[0],
            size: results.length,
            type: ImportHandler.OnePassword
          };
    
          resolve(payload);
          return;
        });
    });
  }
  
  import(event: Electron.IpcMainEvent, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let results: IOnePasswordEntry[] = [];

      createReadStream(path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('error', (err) => reject(err))
        .on('end', async () => {
          results = results.map(x => {
            for (const key in x) {
              if (Object.prototype.hasOwnProperty.call(x, key)) {
                x[key.toLowerCase()] = x[key];
                delete x[key];
              }
            }

            return x;
          });

          const encryptedOutput = await Promise.all(results.map(async (e) => {
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
      
          const serialized = JSON.stringify(encryptedOutput);
          resolve(serialized);
        });
    });
  }
}