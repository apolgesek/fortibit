import { app, dialog, FileFilter, ipcMain, IpcMainEvent, powerMonitor, safeStorage, session } from 'electron';
import { readFileSync, writeFile, writeFileSync } from 'fs-extra';
import { basename, join } from 'path';
import { IProduct } from '../../../product';
import { ImportHandler, IpcChannel } from '../../../shared-models';
import { IConfigService } from '../config';
import { IEncryptionEventService } from '../encryption/encryption-event-service.model';
import { IExportService } from '../export';
import { IIconService } from '../icon';
import { IImportService } from '../import';
import { IWindowService } from '../window';
import { IDatabaseService } from './database-service.model';
import { ISaveFilePayload } from './save-file-payload';

export class DatabaseService implements IDatabaseService {
  private readonly _fileFilters: { filters: FileFilter[] };
  private readonly _fileMap: Map<number, { file: string, password?: Buffer }> = new Map<number, { file: string, password?: Buffer }>();
  private readonly _screenLockHandler = () => {
    this.clear();
    this._windowService.windows.forEach((win) => {
      if (this._fileMap.get(win.browserWindow.id)) {
        win.browserWindow.webContents.send(IpcChannel.Lock);
      }
    });
  };

  setPassword(value: string, windowId: number) {
    if (!value) {
      this._fileMap.get(windowId).password = Buffer.alloc(0);
    } else {
      this._fileMap.get(windowId).password = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value);
    }
  }

  getPassword(windowId: number): string {
    const password = this._fileMap.get(windowId)?.password;

    if (!password) {
      return null;
    }

    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(password) : password.toString();
  }

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IWindowService private readonly _windowService: IWindowService,
    @IWindowService private readonly _iconService: IIconService,
    @IImportService private readonly _importService: IImportService,
    @IExportService private readonly _exportService: IExportService,
    @IEncryptionEventService private readonly _encryptionEventService: IEncryptionEventService
  ) {
    this._fileFilters = {
      filters: [{ name: 'Fortibit database file', extensions: [ this._configService.appConfig.fileExtension ] }]
    };

    ipcMain.on(IpcChannel.SaveFile, async (event: IpcMainEvent, payload: ISaveFilePayload) => {
      await this.saveDatabase(event, payload);
    });

    ipcMain.on(IpcChannel.OpenFile, (event: IpcMainEvent) => {
      this.openDatabase(event);
    });

    ipcMain.handle(IpcChannel.GetImportedDatabaseMetadata, async (_: IpcMainEvent, type: ImportHandler) => {
      try {
        this._importService.setHandler(type);
        const payload = await this._importService.getHandler().getMetadata();
        return payload;
      } catch (error) {
        return undefined;
      }
    });

    ipcMain.handle(IpcChannel.Import, async (event: IpcMainEvent, filePath: string, type: ImportHandler) => {
      this._importService.setHandler(type);
      return await this._importService.getHandler().import(event, filePath);
    });

    ipcMain.handle(IpcChannel.ScanLeaks, async (event: IpcMainEvent, database: string) => {
      return await this.getLeaks(event, database);
    });

    ipcMain.handle(IpcChannel.GetWeakPasswords, async (event: IpcMainEvent, database: string) => {
      return await this.getWeakPasswords(event, database);
    });

    ipcMain.handle(IpcChannel.CreateNew, async (event: IpcMainEvent) => {
      this._fileMap.delete(event.sender.id);
      return true;
    });

    ipcMain.on(IpcChannel.Lock, (event: IpcMainEvent) => {
      this.removeBrowserSession();
      this.setPassword(null, event.sender.id);
    });

    ipcMain.on(IpcChannel.ChangeEncryptionSettings, (_: IpcMainEvent, form: Partial<IProduct>) => {
      this.changeEncryptionSettings(form);
    });

    ipcMain.handle(IpcChannel.Export, async (event: IpcMainEvent, database: string) => {
      return await this._exportService.export(this._windowService.getWindowByWebContentsId(event.sender.id), database);
    });

    if (this._configService.appConfig.lockOnSystemLock) {
      powerMonitor.addListener('lock-screen', this._screenLockHandler);
    }
  }

  public clear() {
    this._fileMap.forEach(x => {
      x.password = null;
    });

    this.removeBrowserSession();
  }

  public setDatabaseEntry(windowId: number, filePath: string) {
    this._fileMap.set(windowId, { file: filePath });
    writeFileSync(join(app.getPath('appData'), app.getName(), 'config', 'workspaces.json'), JSON.stringify({ workspace: filePath }));  
  }

  public getFilePath(windowId: number): string {
    return this._fileMap.get(windowId)?.file;
  }

  public async saveDatabase(event: IpcMainEvent, saveFilePayload: ISaveFilePayload): Promise<void> {    
    let savePath: Electron.SaveDialogReturnValue = { filePath: this._fileMap.get(event.sender.id)?.file, canceled: false };
    const window = this._windowService.getWindowByWebContentsId(event.sender.id);

    if (saveFilePayload.config?.forceNew || (!this.getPassword(event.sender.id) && saveFilePayload.password)) {
      savePath = await dialog.showSaveDialog(window.browserWindow, this._fileFilters);

      if (savePath.canceled) {
        event.reply(IpcChannel.GetSaveStatus, { status: false });
        return;
      }

      const existingPassword = this.getPassword(event.sender.id);
      this.setDatabaseEntry(event.sender.id, savePath.filePath);
      this.setPassword(saveFilePayload.password ?? existingPassword, event.sender.id);
      this._windowService.setIdleTimer();
    }

    const payload = await this._encryptionEventService.saveDatabase(saveFilePayload.database, saveFilePayload.password ?? this.getPassword(event.sender.id) , window.key);
    const finalFilePath = savePath.filePath.endsWith(this._configService.appConfig.fileExtension)
      ? savePath.filePath
      : this.appendExtension(savePath.filePath);

    try {
      writeFile(finalFilePath, payload.encrypted, { encoding: 'base64' }, () => {
        this._fileMap.get(event.sender.id).file = finalFilePath;
        this._windowService.setTitle(event.sender.id, basename(finalFilePath));

        event.reply(IpcChannel.GetSaveStatus, {
          status: true,
          file: finalFilePath,
          notify: saveFilePayload.config?.notify ?? true
        });
      });
    } catch (err) {
      event.reply(IpcChannel.GetSaveStatus, { status: false, error: err });
      throw new Error(err);
    }
  }

  public async openDatabase(event: IpcMainEvent): Promise<void> {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{  name: 'Fortibit database file', extensions: [this._configService.appConfig.fileExtension] }]
    });

    if (!fileObj.canceled) {
      this.setDatabaseEntry(event.sender.id, fileObj.filePaths[0]);
      event.reply(IpcChannel.ProvidePassword, this.getFilePath(event.sender.id));
    }
  }

  public async decryptDatabase(event: IpcMainEvent, password: string): Promise<void> {
    const window = this._windowService.getWindowByWebContentsId(event.sender.id);
    const fileData = readFileSync(this.getFilePath(event.sender.id), { encoding: 'base64' });
    let payload = await this._encryptionEventService.decryptDatabase(fileData, password, window.key);
    
    if (!payload.error) {
      this.setPassword(password, event.sender.id);
      const parsedDb = JSON.parse(payload.decrypted);
      const stores = parsedDb.data.data;
      const entriesStore = stores.find(x => x.tableName === 'entries');
      entriesStore.rows = this._iconService.fixIcons(entriesStore.rows);
      payload.decrypted = JSON.stringify(parsedDb);
      this._iconService.getIcons(window.browserWindow.id, entriesStore.rows);
      this._windowService.setIdleTimer();
    }

    event.reply(IpcChannel.DecryptedContent, { decrypted: !payload.error && payload.decrypted });
  }

  public async getLeaks(event: IpcMainEvent, database: string) {
    const key = this._windowService.getWindowByWebContentsId(event.sender.id).key;
    return await this._encryptionEventService.getLeaks(database, key);
  }

  public async getWeakPasswords(event: IpcMainEvent, database: string) {
    const key = this._windowService.getWindowByWebContentsId(event.sender.id).key;
    return await this._encryptionEventService.getWeakPasswords(database, key);
  }

  private appendExtension(name: string): string {
    return `${name}.${this._configService.appConfig.fileExtension}`;
  }

  private changeEncryptionSettings(settings: Partial<IProduct>) {
    this.handleScreenLockSettingChange(settings);
    this._configService.set(settings);
  }

  private handleScreenLockSettingChange(settings: Partial<IProduct>) {
    if (settings.lockOnSystemLock !== this._configService.appConfig.lockOnSystemLock) {
      if (settings.lockOnSystemLock) {
        powerMonitor.addListener('lock-screen', this._screenLockHandler);
      } else {
        powerMonitor.removeListener('lock-screen', this._screenLockHandler);
      }
    }
  }

  private removeBrowserSession(): Promise<void> {
    return session.defaultSession.clearStorageData();
  }
}