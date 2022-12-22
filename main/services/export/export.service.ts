import { dialog } from "electron";
import { writeFileSync } from "fs";
import { IPasswordEntry } from "../../../shared-models";
import { IEncryptionEventWrapper, MessageEventType } from "../encryption";
import { IWindow } from "../window/window-model";
import { IExportService } from "./export-service.model";

export class ExportService implements IExportService {
  private readonly _fileFilters = {
    filters: [{ name: 'Comma Separated Values File', extensions: [ 'csv' ] }]
  };

  constructor(@IEncryptionEventWrapper private readonly _encryptionEventWrapper: IEncryptionEventWrapper) {}

  async export(window: IWindow, database: string): Promise<boolean> {
    const saveDialogReturnValue = await dialog.showSaveDialog(window.browserWindow, this._fileFilters);
    
    if (saveDialogReturnValue.canceled) {
      return false;
    }
    
    const parsedDb = JSON.parse(database);
    const stores = parsedDb.data.data;
    const entriesStore = stores.find(x => x.tableName === 'entries');

    const encryptionEvent = {
      rows: JSON.stringify(entriesStore.rows),
      type: MessageEventType.BulkDecryptString
    };

    const payload = await this._encryptionEventWrapper.processEventAsync(encryptionEvent, window.key) as { error: string, decrypted: IPasswordEntry[] };
    const header: (keyof IPasswordEntry)[] = ['title', 'username', 'password', 'url', 'notes'];
    let data = header.join(',') + '\r\n';

    for (const entry of payload.decrypted) {
      data += `${entry.title},${entry.username},${entry.password},${entry.url},${entry.notes}\r\n`;
    }

    writeFileSync(saveDialogReturnValue.filePath, data);

    return true;
  }
}