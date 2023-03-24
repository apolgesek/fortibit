import { app, ipcMain, IpcMainEvent } from "electron";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { IPasswordEntry, IpcChannel } from "../../../shared-models";
import { IConfigService } from "../config";
import { IFileService } from "../file";
import { IWindowService } from "../window";
import { IIconService } from "./icon-service.model";

interface QueueItem {
  windowId: number;
  id: number;
  url: string;
  attempts: number;
}

export class IconService implements IIconService {
  private readonly iconDirectory: string;
  private readonly iconQueue: QueueItem[] = [];
  private readonly iconDownloadAttemptIntervalSeconds = 10;
  private psl;

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IFileService private readonly _fileService: IFileService,
    @IWindowService private readonly _windowService: IWindowService
  ) {
    this.iconDirectory = join(app.getPath('appData'), this._configService.appConfig.name.toLowerCase(), 'icons');
    if (!existsSync(this.iconDirectory)) {
      mkdirSync(this.iconDirectory);
    }

    ipcMain.on(IpcChannel.TryGetIcon, (event: IpcMainEvent, id: number, url: string) => {
      this.tryGetIcon(url).then((iconPath: string) => {
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);
        window.browserWindow.webContents.send(IpcChannel.UpdateIcon, id, iconPath);
      }).catch(err => {});
    });

    ipcMain.on(IpcChannel.TryReplaceIcon, (event: IpcMainEvent, id: number, path: string, newUrl: string) => {
      this.tryReplaceIcon(path, newUrl).then((iconPath: string) => {
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);
        window.browserWindow.webContents.send(IpcChannel.UpdateIcon, id, iconPath);
      }).catch(err => {});
    });

    ipcMain.on(IpcChannel.RemoveIcon, (event: IpcMainEvent, entry: IPasswordEntry) => {
      this.removeIcon(entry.icon).then(() => {
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);
        window.browserWindow.webContents.send(IpcChannel.UpdateIcon, entry.id);
      }).catch(err => {});
    });

    ipcMain.handle(IpcChannel.CheckIconExists, (_: IpcMainEvent, path: string) => {
      return existsSync(path);
    });

    setInterval(() => {
      if (this.iconQueue.length) {
        for (let i = 0; i < this.iconQueue.length; i++) {
          const event = this.iconQueue[i];
      
          this.getFile(event.url).then(path => {
            this._windowService.getWindowByWebContentsId(event.windowId)
              .browserWindow
              .webContents
              .send(IpcChannel.UpdateIcon, event.id, path);

            this.iconQueue.shift();
          }).catch(err => {
            event.attempts++;
            if (event.attempts === 3) {
              this.iconQueue.shift();
            }
          }); 
        }
      }
    }, this.iconDownloadAttemptIntervalSeconds * 1000);
  }

  getIcons(windowId: number, entries: IPasswordEntry[]) {
    for (const entry of entries) {
      if (entry.url && !entry.icon) {
        this.addToQueue({ windowId, id: entry.id, url: entry.url, attempts: 0 });
      }
    }
  }

  async tryGetIcon(url: string): Promise<string> {
    return this.getFile(url);
  }
  
  async tryReplaceIcon(path: string, newUrl: string): Promise<string> {
    await this.removeIcon(path);

    if (newUrl) {
      return this.getFile(newUrl);
    } else {
      return Promise.resolve(null);
    }
  }

  removeIcon(path: string): Promise<boolean> {
    if (path && existsSync(path)) {
      unlinkSync(path);
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  fixIcons(entries: IPasswordEntry[]) {
    return entries.map(entry => {
      if (entry.icon && !entry.icon.startsWith('data:image/png') && !existsSync(entry.icon)) {
        return { ...entry, icon: null };
      } else {
        return entry;
      }
    });
  }

  private async getFile(url: string): Promise<string> {
    const formattedHostname = await this.getFileName(url);

    const fileUrl = this._configService.appConfig.webUrl + '/icon/' + formattedHostname + '.png';
    const filePath = join(`${this.iconDirectory}`, `${formattedHostname}.png`);

    if (existsSync(filePath)) {
      return Promise.resolve(filePath);
    }

    return this._fileService.download(fileUrl, filePath);
  }

  private async getFileName(url: string): Promise<string> {
    if (!this.psl) {
      this.psl = await import('psl');
    }

    if (!/^https?:\/\//.test(url)) {
      url = 'https://' + url;
    }

    return new Promise((resolve) => {
      url = this.psl.parse(new URL(url).hostname).domain;
      resolve(url.replaceAll('.', '-'));
    });
  }

  private addToQueue(event: QueueItem) {
    this.iconQueue.push(event);
  }
}