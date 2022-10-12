import { emptyDirSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'fs-extra';
import { request } from 'https';
import { arch, platform } from 'os';
import { join } from 'path';
import { IWindowService } from '../window/window-service.model';
import { IUpdateService } from './update-service.model';
import { app, ipcMain, IpcMainEvent } from 'electron';
import { createHash } from 'crypto';
import { IpcChannel, UpdateState } from '../../../shared-models';
import { IConfigService } from '../config';
import { IFileService } from '../file';
import { ICommandHandler } from './command-handler.model';

interface UpdateInformation {
  version: string;
  fileName: string;
  url: string;
  checksum: string;
}

export class UpdateService implements IUpdateService {
  private readonly updateDirectory: string;
  private readonly fileExt = process.platform === 'win32' ? 'exe' : 'dmg';

  private _updateDestinationPath = '';
  private _updateInformation: UpdateInformation;
  private _updateState: UpdateState;

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IWindowService private readonly _windowService: IWindowService,
    @IFileService private readonly _fileService: IFileService,
    @ICommandHandler private readonly _commandHandler: ICommandHandler
  ) {
    this.updateDirectory = join(app.getPath('appData'), this._configService.appConfig.name.toLowerCase(), 'update');

    ipcMain.on(IpcChannel.GetUpdateState, (event: IpcMainEvent) => {
      if (!this.updateState) {
        return;
      }

      this._windowService.getWindowByWebContentsId(event.sender.id)
        .browserWindow.webContents
        .send(IpcChannel.UpdateState, this.updateState, this._updateInformation.version);
    });

    ipcMain.on(IpcChannel.CheckUpdate, (event: IpcMainEvent) => {
      this.checkForUpdates();
    });
  }

  public get updateState() {
    return this._updateState;
  }

  checkForUpdates(): Promise<boolean> {  
    return new Promise((resolve, reject) => {
      if (this.updateState === UpdateState.Available || this.updateState === UpdateState.Downloaded) {
        // reannounce update status
        this.setUpdateState(this.updateState);
  
        resolve(true);

        return;
      }


      const req = request(this._configService.appConfig.updateUrl, res => {
        let body = '';

        res.on('data', async (data: Buffer) => {
          body += data.toString();
        });

        res.on('error', (err) => {
          console.log(err);
          reject();
        });

        res.on('end', () => {
          const updateMetadataArray = body.trim().split(',');
          const updateMetadata = {
            productName: updateMetadataArray[0],
            version: updateMetadataArray[1],
            checksum: updateMetadataArray[2],
            commit: updateMetadataArray[3]
          };

          setTimeout(() => {
            const isUpdateAvailable = updateMetadata.version.localeCompare(app.getVersion()) === 1;

            if (isUpdateAvailable) {
              this.resolveUpdateInformation(updateMetadata);
              this.setUpdateState(UpdateState.Available);
      
              if (!this.validateUpdateFile()) {
                this.getUpdate();
              }
            } else {
              this.setUpdateState(UpdateState.NotAvailable);
            }
  
            resolve(isUpdateAvailable);
          }, 3000);
        });
      }).on('error', (err) => {
        console.log(err.message);

        reject();
      });

      req.end();
    });
  }

  public isNewUpdateAvailable(): boolean {
    return !!this._updateInformation;
  }

  async updateAndRelaunch(): Promise<void> {
    this._windowService.windows.forEach(window => {
      window.browserWindow.hide();
    });

    this.spawnUpdateProcess();
  }

  private getFileHash(filePath: string): string {
    return createHash('md5')
      .update(readFileSync(join(this.updateDirectory, filePath)))
      .digest('hex');
  }

  private validateUpdateFile(): boolean {
    if (!existsSync(this.updateDirectory)) {
      mkdirSync(this.updateDirectory, { recursive: true });
    }

    const updateFilePaths = readdirSync(this.updateDirectory);

    if (updateFilePaths.some(filePath => this._updateInformation.checksum === this.getFileHash(filePath))) {
      this.setUpdateState(UpdateState.Downloaded);

      return true;
    }

    return false;
  }

  private spawnUpdateProcess() {
    if (existsSync(this._updateDestinationPath) || !this.isNewUpdateAvailable()) {
      return;
    }

    const filePath = this.getExecutablePath(this._updateInformation.fileName);
    this._commandHandler.updateApp(filePath, this.updateDirectory);
    app.quit();
  }

  private async getUpdate(): Promise<string> {
    this.cleanup();

    const onError = () => {
      this.cleanup();
    };

    const onFinish = () => {
      renameSync(this._updateDestinationPath, this.getExecutablePath(this._updateDestinationPath));
      this.validateUpdateFile();
    };

    return this._fileService.download(this._updateInformation.url, this._updateDestinationPath, onError, onFinish);
  }

  private cleanup() {
    emptyDirSync(this.updateDirectory);
  }

  private getExecutablePath(path: string) {
    const pathParts = path.split('.');

    pathParts.pop();
    pathParts.push(this.fileExt);

    return pathParts.join('.');
  }

  private resolveUpdateInformation(updateMetadata) {
    this._updateInformation = {
      version: null,
      fileName: null,
      url: null,
      checksum: null
    };

    this._updateInformation.version = updateMetadata.version;
    this._updateInformation.fileName = `${this._configService.appConfig.name.toLowerCase()}_${updateMetadata.version}_${platform()}_${arch()}_update.${this._configService.appConfig.temporaryFileExtension}`;
    this._updateInformation.url = `${this._configService.appConfig.webUrl}/update/${this._updateInformation.fileName.replace(`.${this._configService.appConfig.temporaryFileExtension}`, `.${this.fileExt}`)}`;
    this._updateInformation.checksum = updateMetadata.checksum;

    this._updateDestinationPath = join(this.updateDirectory, this._updateInformation.fileName);
  }

  private setUpdateState(state: UpdateState) {
    this._updateState = state;

    this._windowService.windows.forEach(window => {
      window.browserWindow.webContents.send(IpcChannel.UpdateState, this.updateState, this._updateInformation?.version);
    });
  }
}