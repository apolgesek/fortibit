import { dialog } from "electron";
import { IPasswordEntry } from "../../../shared-models";
import { IEncryptionEventWrapper, MessageEventType } from "../encryption";
import { IWindow } from "../window/window-model";
import { IExportService } from "./export-service.model";
import { CsvWriter } from "../../util";

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
    CsvWriter.writeFile(saveDialogReturnValue.filePath, payload.decrypted, ['title', 'username', 'password', 'url', 'notes']);
  
    return true;
  }
}