import { ChildProcess } from 'child_process';
import { FileFilter, IpcMainEvent } from 'electron';
import { readFile, writeFile } from 'fs';
import { MessageEventType } from '..';
import { appConfig } from '../../../config';
import { IpcChannel } from '../../../shared-models';
import { StateStore } from '../../store/state-store';
import { IEncryptionProcessManager } from '../encryption/encryption-service.model';

export class FileManagementService {
  private _encryptionService: IEncryptionProcessManager;
  private _encryptionProcess: ChildProcess;

  private readonly _fileFilters: { filters: FileFilter[] } = {
    filters: [{ name: 'Fortibit database file', extensions: [ appConfig.fileExtension ] }]
  };

  constructor(
    encryptionService: IEncryptionProcessManager,
  ) {
    this._encryptionService = encryptionService;
  }

  public async saveFile(event: IpcMainEvent, database: JSON, newPassword: string) {
    let savePath: Electron.SaveDialogReturnValue = { filePath: StateStore.fileMap.get(event.sender.id), canceled: false };

    if (!StateStore.currentPassword) {
      const { dialog } = await import('electron');
      const browserWindow = StateStore.windows.find(x => x.webContents.id === event.sender.id);
      savePath = await dialog.showSaveDialog(browserWindow, this._fileFilters);

      if (savePath.canceled) {
        event.reply(IpcChannel.GetSaveStatus, { status: false });
        return;
      }
    }

    this._encryptionProcess = await this._encryptionService.createEncryptionProcess();
    this._encryptionProcess.once('message', async (encrypted: string) => {
      const finalFilePath = savePath.filePath.endsWith(appConfig.fileExtension)
        ? savePath.filePath
        : savePath.filePath + '.' + appConfig.fileExtension;

      try {
        writeFile(finalFilePath, encrypted, { encoding: 'base64' }, () => {
          StateStore.fileMap.set(event.sender.id, finalFilePath);
          event.reply(IpcChannel.GetSaveStatus, { status: true, file: StateStore.fileMap.get(event.sender.id) });
        });
      } catch (err) {
        event.reply(IpcChannel.GetSaveStatus, { status: false, message: err });
      }
    });

    if (!StateStore.currentPassword) {
      StateStore.currentPassword = Buffer.from(newPassword);
    }

    this._encryptionProcess.send({
      database,
      newPassword: newPassword ?? StateStore.currentPassword,
      memoryKey: StateStore.memoryKey,
      type: MessageEventType.EncryptDatabase
    });
  }

  public async openFile(event: IpcMainEvent) {
    const { dialog } = await import('electron');

    const fileObj = await dialog.showOpenDialog({
      properties: ['openFile'],
      ...this._fileFilters
    });

    if (!fileObj.canceled) {
      StateStore.fileMap.set(event.sender.id, fileObj.filePaths[0]);
      event.reply(IpcChannel.ProvidePassword, StateStore.fileMap.get(event.sender.id));
    }
  }

  public async decryptDatabase(event: IpcMainEvent, password: string) {
    StateStore.currentPassword = Buffer.from(password);
  
    readFile(StateStore.fileMap.get(event.sender.id), { encoding: 'base64' }, async (err, data: string) => {
      const fileData = data;

      this._encryptionProcess = await this._encryptionService.createEncryptionProcess();
      this._encryptionProcess.once('message', (payload: { decrypted: string, error: string }) => {
        event.reply(IpcChannel.DecryptedContent, {
          decrypted: payload.error ? undefined : payload.decrypted,
          file: StateStore.fileMap.get(event.sender.id)
        });
      });

      this._encryptionProcess.send({
        fileData,
        password,
        memoryKey: StateStore.memoryKey,
        type: MessageEventType.DecryptDatabase
      });
    });
  }
}