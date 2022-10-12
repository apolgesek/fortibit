import { app, dialog, FileFilter, ipcMain, IpcMainEvent, powerMonitor, safeStorage } from 'electron';
import { existsSync, readFileSync, rmSync, writeFile, writeFileSync } from 'fs-extra';
import { basename, join } from 'path';
import { IProduct } from '../../../product';
import { ImportHandler, IPasswordEntry, IpcChannel } from '../../../shared-models';
import { IConfigService } from '../config';
import { IEncryptionProcessService, MessageEventType } from '../encryption';
import { IExportService } from '../export';
import { IIconService } from '../icon';
import { IImportService } from '../import';
import { IWindowService } from '../window';
import { IDatabaseService } from './database-service.model';

interface ISaveFilePayload {
  database: JSON;
  newPassword: string;
  config: {
    forceNew: boolean;
  };
}

export class DatabaseService implements IDatabaseService {
  private readonly _fileFilters: { filters: FileFilter[] };
  private readonly _fileMap: Map<number, string> = new Map<number, string>();
  private readonly _screenLockHandler = () => {
    if (!this._currentPassword) {
      return;
    }

    this.clear();
    this.dbPassword = null;

    this._windowService.windows.forEach((win) => {
      if (this._fileMap.get(win.browserWindow.id)) {
        this._windowService.windows.find(x => x.browserWindow.webContents.id === win.browserWindow.id)
          .browserWindow.webContents.send(IpcChannel.Lock);
      }
    });
  };

  private _currentPassword: Buffer;

  set dbPassword(value: string) {
    if (!value) {
      this._currentPassword = Buffer.alloc(0);
    } else {
      this._currentPassword = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value);
    }
  }

  get dbPassword(): string {
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(this._currentPassword) : this._currentPassword.toString();
  }

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IEncryptionProcessService private readonly _encryptionProcessService: IEncryptionProcessService,
    @IWindowService private readonly _windowService: IWindowService,
    @IWindowService private readonly _iconService: IIconService,
    @IImportService private readonly _importService: IImportService,
    @IExportService private readonly _exportService: IExportService
  ) {
    this._fileFilters = {
      filters: [{ name: 'Fortibit database file', extensions: [ this._configService.appConfig.fileExtension ] }]
    };

    ipcMain.on(IpcChannel.SaveFile, async (event: IpcMainEvent, payload: ISaveFilePayload) => {
      const { database, newPassword, config } = payload;

      await this.saveDatabase(event, database, newPassword, config);
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

    ipcMain.handle(IpcChannel.CreateNew, async (event: IpcMainEvent) => {
      this._fileMap.delete(event.sender.id);
      this.dbPassword = null;

      return true;
    });

    ipcMain.on(IpcChannel.Lock, (_: IpcMainEvent) => {
      this.clear();
      this.dbPassword = null;
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
    const partitionsDir = join(app.getPath("appData"), this._configService.appConfig.name.toLowerCase(), 'Partitions');

    if (existsSync(partitionsDir)) {
      rmSync(partitionsDir, { recursive: true });
    }
  }

  public setFilePath(windowId: number, filePath: string) {
    this._fileMap.set(windowId, filePath);

    writeFileSync(join(global['__basedir'], 'workspaces.json'), JSON.stringify({ workspace: filePath }));  
  }

  public getFilePath(windowId: number): string {
    return this._fileMap.get(windowId);
  }

  public async saveDatabase(event: IpcMainEvent, database: JSON, newPassword: string, config: { forceNew: boolean }): Promise<void> {    
    let savePath: Electron.SaveDialogReturnValue = { filePath: this._fileMap.get(event.sender.id), canceled: false };
    const window = this._windowService.getWindowByWebContentsId(event.sender.id);

    if (config?.forceNew || !this.dbPassword) {
      savePath = await dialog.showSaveDialog(window.browserWindow, this._fileFilters);

      if (savePath.canceled) {
        event.reply(IpcChannel.GetSaveStatus, { status: false });
        return;
      }

      this.dbPassword = newPassword;
      this._windowService.setIdleTimer(event.sender.id);
    }

    const encryptionEvent = {
      database,
      newPassword: newPassword ?? this.dbPassword,
      type: MessageEventType.EncryptDatabase
    };

    const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent, window.key) as { encrypted: string };

    const finalFilePath = savePath.filePath.endsWith(this._configService.appConfig.fileExtension)
      ? savePath.filePath
      : this.appendExtension(savePath.filePath);

    try {
      writeFile(finalFilePath, payload.encrypted, { encoding: 'base64' }, () => {
        this.setFilePath(event.sender.id, finalFilePath);
        this._windowService.setTitle(event.sender.id, basename(finalFilePath));

        event.reply(IpcChannel.GetSaveStatus, { status: true, file: this._fileMap.get(event.sender.id) });
      });
    } catch (err) {
      event.reply(IpcChannel.GetSaveStatus, { status: false, message: err });
      throw new Error(err);
    }
  }

  public async openDatabase(event: IpcMainEvent): Promise<void> {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{  name: 'Fortibit database file', extensions: [this._configService.appConfig.fileExtension] }]
    });

    if (!fileObj.canceled) {
      this.setFilePath(event.sender.id, fileObj.filePaths[0]);
      event.reply(IpcChannel.ProvidePassword, this._fileMap.get(event.sender.id));
    }
  }

  public async decryptDatabase(event: IpcMainEvent, password: string): Promise<void> {
    this.dbPassword = password;
    const window = this._windowService.getWindowByWebContentsId(event.sender.id);
  
    const fileData = readFileSync(this._fileMap.get(event.sender.id), { encoding: 'base64' });

    const encryptionEvent = {
      fileData,
      password,
      type: MessageEventType.DecryptDatabase
    };

    const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent, window.key) as { error: string, decrypted: string };
    
    if (!payload.error) {
      const parsedDb = JSON.parse(payload.decrypted);
      const stores = parsedDb.data.data;
      const entriesStore = stores.find(x => x.tableName === 'entries');
  
      this._iconService.getIcons(window.browserWindow.id, entriesStore.rows);
      this._windowService.setIdleTimer(event.sender.id);
    }

    event.reply(IpcChannel.DecryptedContent, {
      decrypted: !payload.error && payload.decrypted,
      file: this._fileMap.get(event.sender.id)
    });
  }

  public async getLeaks(event: IpcMainEvent, database: string) {
    const encryptionEvent = {
      database,
      type: MessageEventType.GetLeaks
    };

    const window = this._windowService.getWindowByWebContentsId(event.sender.id);
    const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent, window.key) as { error: string, data: string };

    return {
      data: !payload.error && payload.data,
    };
  }

  private appendExtension(name: string): string {
    return `${name}.${this._configService.appConfig.fileExtension}`;
  }

  private changeEncryptionSettings(settings: Partial<IProduct>) {
    if (settings.lockOnSystemLock !== this._configService.appConfig.lockOnSystemLock) {
      if (settings.lockOnSystemLock) {
        powerMonitor.addListener('lock-screen', this._screenLockHandler);
      } else {
        powerMonitor.removeListener('lock-screen', this._screenLockHandler);
      }
    }
  
    this._configService.set(settings);
  }
}