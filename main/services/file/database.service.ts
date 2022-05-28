import { app, dialog, FileFilter, ipcMain, IpcMainEvent, powerMonitor, safeStorage } from 'electron';
import { XMLParser } from 'fast-xml-parser';
import { existsSync, readFileSync, rmSync, writeFile } from 'fs-extra';
import { join } from 'path';
import { IEncryptionProcessService, IWindowService, MessageEventType } from '..';
import { IProduct } from '../../../product';
import { IpcChannel } from '../../../shared-models';
import { IConfigService } from '../config';
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
      if (this._fileMap.get(win.id)) {
        this._windowService.windows.find(x => x.webContents.id === win.id).webContents.send(IpcChannel.Lock);
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
    @IWindowService private readonly _windowService: IWindowService
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

    ipcMain.handle(IpcChannel.GetImportedDatabaseMetadata, async () => {
      return await this.getKeepassDatabaseInfo();
    });

    ipcMain.handle(IpcChannel.Import, async (event: IpcMainEvent, filePath: string) => {
      return await this.importKeepassDatabase(event, filePath);
    });

    ipcMain.handle(IpcChannel.ScanLeaks, async (event: IpcMainEvent, database: string) => {
      return await this.getLeaks(event, database);
    });

    ipcMain.on(IpcChannel.Lock, (_: IpcMainEvent) => {
      this.clear();
      this.dbPassword = null;
    });

    ipcMain.on(IpcChannel.ChangeEncryptionSettings, (_: IpcMainEvent, form: Partial<IProduct>) => {
      this.changeEncryptionSettings(form);
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
  }

  public getFilePath(windowId: number): string {
    return this._fileMap.get(windowId);
  }

  public async saveDatabase(event: IpcMainEvent, database: JSON, newPassword: string, config: { forceNew: boolean }): Promise<void> {    
    let savePath: Electron.SaveDialogReturnValue = { filePath: this._fileMap.get(event.sender.id), canceled: false };
    
    if (config?.forceNew || !this.dbPassword) {
      const browserWindow = this._windowService.getWindowByWebContentsId(event.sender.id);
      savePath = await dialog.showSaveDialog(browserWindow, this._fileFilters);

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

    const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { encrypted: string };

    const finalFilePath = savePath.filePath.endsWith(this._configService.appConfig.fileExtension)
      ? savePath.filePath
      : this.appendExtension(savePath.filePath);

    try {
      writeFile(finalFilePath, payload.encrypted, { encoding: 'base64' }, () => {
        this._fileMap.set(event.sender.id, finalFilePath);
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
      this._fileMap.set(event.sender.id, fileObj.filePaths[0]);
      event.reply(IpcChannel.ProvidePassword, this._fileMap.get(event.sender.id));
    }
  }

  public async decryptDatabase(event: IpcMainEvent, password: string): Promise<void> {
    this.dbPassword = password;
  
    const fileData = readFileSync(this._fileMap.get(event.sender.id), { encoding: 'base64' });

    const encryptionEvent = {
      fileData,
      password,
      type: MessageEventType.DecryptDatabase
    };

    const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { error: string, decrypted: string };
    this._windowService.setIdleTimer(event.sender.id);

    event.reply(IpcChannel.DecryptedContent, {
      decrypted: !payload.error && payload.decrypted,
      file: this._fileMap.get(event.sender.id)
    });
  }

  public async getLeaks(_: IpcMainEvent, database: string) {
    const encryptionEvent = {
      database,
      type: MessageEventType.GetLeaks
    };

    const payload = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { error: string, data: string };

    return {
      data: !payload.error && payload.data,
    };
  }

  private async getKeepassDatabaseInfo(): Promise<any> {
    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Extensible Markup Language', extensions: ['xml'] }]
    });

    return new Promise((resolve, reject) => {
      if (!fileObj.canceled) {
        const xmlFile = readFileSync(fileObj.filePaths[0]).toString();
        const parser = new XMLParser();
        const data = parser.parse(xmlFile);
  
        const groups = data.KeePassFile.Root.Group;
        const output = Array.isArray(groups) ? groups.map(x => this.mapEntries(x)) : this.mapEntries(groups.Entry);
  
        const payload = {
          filePath: fileObj.filePaths[0],
          size: output.length
        };
  
        resolve(payload);
      }
  
      reject();
    });
  }

  private async importKeepassDatabase(_: IpcMainEvent, filePath: string): Promise<string> {
    const xmlFile = readFileSync(filePath).toString();
    const parser = new XMLParser();
    const data = parser.parse(xmlFile);

    const groups = data.KeePassFile.Root.Group;
    const output = Array.isArray(groups) ? groups.map(x => this.mapEntries(x)) : this.mapEntries(groups.Entry);

    const encryptedOutput = await Promise.all(output.map(async (e) => {
      const encryptionEvent = {
        plain: e.password,
        type: MessageEventType.EncryptString
      };
  
      const password = await this._encryptionProcessService.processEventAsync(encryptionEvent) as { encrypted: string };

      return {
        ...e,
        password: password.encrypted
      };
    }));

    return Promise.resolve(JSON.stringify(encryptedOutput));
  }

  private mapEntries(entries: any[]) {
    return entries.map(x => {
      return {
        groupId: 1,
        username: x.String.find(x => x.Key === 'UserName').Value?.toString(),
        password: x.String.find(x => x.Key === 'Password').Value?.toString(),
        title: x.String.find(x => x.Key === 'Title').Value?.toString(),
        url: x.String.find(x => x.Key === 'URL').Value?.toString(),
        notes: x.String.find(x => x.Key === 'Notes').Value?.toString(),
        creationDate: new Date(),
      };
    });
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