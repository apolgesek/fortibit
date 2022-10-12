import { app, ipcMain, IpcMainEvent } from "electron";
import { existsSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { IPasswordEntry, IpcChannel } from "../../../shared-models";
import { IConfigService } from "../config";
import { IFileService } from "../file";
import { IWindowService } from "../window";
import { IIconService } from "./icon-service.model";

export class IconService implements IIconService {
  private readonly iconDirectory: string;
  private readonly iconQueue: { windowId: number, id: number, url: string }[] = [];
  private readonly iconDownloadAttemptIntervalSeconds = 10;

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IFileService private readonly _fileService: IFileService,
    @IWindowService private readonly _windowService: IWindowService
  ) {
    this.iconDirectory = join(app.getPath('appData'), this._configService.appConfig.name.toLowerCase(), 'icons');

    ipcMain.on(IpcChannel.TryGetIcon, (event: IpcMainEvent, id: number, url: string) => {
      this.tryGetIcon(event.sender.id, id, url).then((iconPath: string) => {
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);

        window.browserWindow.webContents.send(IpcChannel.UpdateIcon, id, iconPath);
      }).catch(err => {});
    });

    ipcMain.on(IpcChannel.TryReplaceIcon, (event: IpcMainEvent, id: number, path: string, newUrl: string) => {
      this.tryReplaceIcon(event.sender.id, id, path, newUrl).then((iconPath: string) => {
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);

        window.browserWindow.webContents.send(IpcChannel.UpdateIcon, id, iconPath);
      }).catch(err => {});
    });

    ipcMain.handle(IpcChannel.RemoveIcon, (event: IpcMainEvent, entry: IPasswordEntry) => {
      this.removeIcon(entry.iconPath).then(() => {
        const window = this._windowService.getWindowByWebContentsId(event.sender.id);

        window.browserWindow.webContents.send(IpcChannel.UpdateIcon, entry.id);
      }).catch(err => {});
    });

    setInterval(() => {
      if (this.iconQueue.length) {
        for (let i = 0; i < this.iconQueue.length; i++) {
          const event = this.iconQueue.shift();
      
          this.getFile(event.windowId, event.id, event.url).then(path => {
            this._windowService.getWindowByWebContentsId(event.windowId)
              .browserWindow
              .webContents
              .send(IpcChannel.UpdateIcon, event.id, path);
          }).catch(err => { console.log(err); }); 
        }
      }
    }, this.iconDownloadAttemptIntervalSeconds * 1000);
  }

  getIcons(windowId: number, entries: IPasswordEntry[]) {
    for (const entry of entries) {
      if (entry.url && !entry.iconPath) {
        this.addToQueue({ windowId, id: entry.id, url: entry.url });
      }
    }
  }

  tryGetIcon(windowId: number, id: number, url: string): Promise<string> {
    return this.getFile(windowId, id, url);
  }
  
  async tryReplaceIcon(windowId: number, id: number, path: string, newUrl: string): Promise<string> {
    await this.removeIcon(path);

    if (newUrl) {
      return this.getFile(windowId, id, newUrl);
    } else {
      return Promise.resolve(null);
    }
  }

  removeIcon(path: string): Promise<boolean> {
    if (path) {
      unlinkSync(path);

      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  private async getFile(windowId: number, id: number, url: string): Promise<string> {
    const formattedHostname = await this.getFileName(url);

    const fileUrl = this._configService.appConfig.staticContentUrl + '/icon/' + formattedHostname + '.png';
    const filePath = join(`${this.iconDirectory}`, `${formattedHostname}.png`);


    if (existsSync(filePath)) {
      return Promise.resolve(filePath);
    }

    const onError = () => {
      this.addToQueue({ windowId, id, url });
    }

    return this._fileService.download(fileUrl, filePath, onError);
  }

  private async getFileName(url: string): Promise<string> {
    if (!/^https?:\/\//.test(url)) {
      url = 'https://' + url;
    }

    return new Promise((resolve) => {
      import('psl').then(psl => {
        url = psl.parse(new URL(url).hostname).domain;
  
        resolve(url.replaceAll('.', '-'));
      });
    });
  }

  private addToQueue(event: { windowId: number, id: number, url: string }) {
    this.iconQueue.push(event);
  }
}