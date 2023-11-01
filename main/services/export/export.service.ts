import { CsvWriter, getDefaultPath, getFileFilter } from "@root/main/util";
import { stringify } from "csv-stringify/sync";
import { dialog } from "electron";
import { IPasswordEntry } from "../../../shared";
import { IConfigService } from "../config";
import { IEncryptionEventWrapper, MessageEventType } from "../encryption";
import { IWindow } from "../window/window-model";
import { IExportService } from "./export-service.model";
import { writeFileSync } from "fs";

export class ExportService implements IExportService {
  constructor(
    @IEncryptionEventWrapper private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
    @IConfigService private readonly _configService: IConfigService
  ) {}

  async export(window: IWindow, database: string): Promise<boolean> {
    const saveDialogReturnValue = await dialog.showSaveDialog(window.browserWindow, {
      defaultPath: getDefaultPath(this._configService.appConfig, ''),
      filters: [getFileFilter(this._configService.appConfig, 'csv')]
    });
    
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