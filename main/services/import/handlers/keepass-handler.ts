import { dialog, IpcMainEvent } from "electron";
import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";
import { ImportHandler } from "../../../../shared-models";
import { IEncryptionProcessService, MessageEventType } from "../../encryption";
import { IWindowService } from '../../window';
import { IImportHandler } from "../import-handler.model";
import { IImportMetadata } from "./import-metadata.model";

export class KeePassHandler implements IImportHandler {
  constructor(
    private readonly _windowService: IWindowService,
    private readonly _encryptionProcessService: IEncryptionProcessService
  ) {}

  public async getMetadata(): Promise<IImportMetadata> {
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

      const groups = data.KeePassFile.Root.Group;
      const output = Array.isArray(groups) ? groups.map(x => this.mapEntries(x)) : this.mapEntries(groups.Entry);

      const payload = {
        filePath: fileObj.filePaths[0],
        size: output.length,
        type: ImportHandler.KeePass
      };

      resolve(payload);  
    });
  }

  public async import(event: IpcMainEvent, path: string): Promise<string> {
    const xmlFile = readFileSync(path).toString();
    const parser = new XMLParser();
    const data = parser.parse(xmlFile);

    const groups = data.KeePassFile.Root.Group;
    const output = Array.isArray(groups) ? groups.map(x => this.mapEntries(x)) : this.mapEntries(groups.Entry);

    const encryptedOutput = await Promise.all(output.map(async (e) => {
      const encryptionEvent = {
        plain: e.password,
        type: MessageEventType.EncryptString
      };
  
      const window = this._windowService.getWindowByWebContentsId(event.sender.id);
      const password = await this._encryptionProcessService.processEventAsync(encryptionEvent, window.key) as { encrypted: string };

      return {
        ...e,
        password: password.encrypted
      };
    }));

    const serialized = JSON.stringify(encryptedOutput);
    return Promise.resolve(serialized);
  }

  private mapEntries(entries: any[]) {
    return entries.map(x => {
      return {
        username: x.String.find(x => x.Key === 'UserName').Value?.toString(),
        password: x.String.find(x => x.Key === 'Password').Value?.toString(),
        title: x.String.find(x => x.Key === 'Title').Value?.toString(),
        url: x.String.find(x => x.Key === 'URL').Value?.toString(),
        notes: x.String.find(x => x.Key === 'Notes').Value?.toString(),
      };
    });
  }
}