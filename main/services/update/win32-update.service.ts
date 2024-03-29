import { spawn } from 'child_process';
import { createWriteStream, emptyDirSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'fs-extra';
import { request } from 'https';
import { arch, platform } from 'os';
import { join } from 'path';
import { IWindowService } from '../window/window-service.model';
import { IUpdateService } from './update-service.model';
import { app } from 'electron';
import { createHash } from 'crypto';
import { IpcChannel, UpdateState } from '../../../shared-models';
import { IConfigService } from '../config';
import { ProcessArgument } from '../../process-argument.enum';

interface UpdateInformation {
  version: string;
  fileName: string;
  url: string;
  checksum: string;
}

export class Win32UpdateService implements IUpdateService {
  private readonly updateDirectory: string;

  private _updateDestinationPath = '';
  private _updateInformation: UpdateInformation;
  private _updateState = UpdateState.NotAvailable;

  constructor(
    @IConfigService private readonly _configService: IConfigService,
    @IWindowService private readonly _windowService: IWindowService
  ) {
    this.updateDirectory = join(app.getPath('appData'), this._configService.appConfig.name.toLowerCase(), 'update');
  }

  public get updateState() {
    return this._updateState;
  }

  checkForUpdates(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.updateState === UpdateState.Available || this.updateState === UpdateState.Downloaded) {
        // reannounce update status
        this.setUpdateState(this.updateState);
  
        resolve(true);

        return;
      }

      const req = request(this._configService.appConfig.updateUrl, res => {
        res.on('data', async (data: Buffer) => {
          const updateMetadataArray = data.toString().trim().split(',');
          const updateMetadata = {
            productName: updateMetadataArray[0],
            version: updateMetadataArray[1],
            checksum: updateMetadataArray[2],
            commit: updateMetadataArray[3]
          };

          const isUpdateAvailable = updateMetadata.version.localeCompare(app.getVersion()) === 1;

          if (isUpdateAvailable) {
            this.resolveUpdateInformation(updateMetadata);
            this.setUpdateState(UpdateState.Available);
    
            if (!this.validateUpdateFile()) {
              this.getUpdate();
            }
          }

          resolve(isUpdateAvailable);
        });
      }).on('error', (err) => {
        console.log(err.message);
      });

      req.end();
    });
  }

  public isNewUpdateAvailable(): boolean {
    return !!this._updateInformation;
  }

  async updateAndRelaunch(): Promise<void> {
    this._windowService.windows.forEach(w => {
      w.hide();
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

    spawn(this.getExecutablePath(this._updateInformation.fileName), ['/R'],
      {
        cwd: this.updateDirectory,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
        windowsVerbatimArguments: true
      }
    );

    app.quit();
  }

  private async getUpdate(): Promise<void> {
    this.cleanup();

    const file = createWriteStream(this._updateDestinationPath);

    const req = request(this._updateInformation.url, res => {
      const stream = res.pipe(file);

      stream.on('error', () => {
        this.cleanup();
      });

      stream.on('finish', () => {
        renameSync(this._updateDestinationPath, this.getExecutablePath(this._updateDestinationPath));
        this.validateUpdateFile();
      });
    }).on('error', (err) => {
      console.log(err.message);
    });

    req.end();
  }

  private cleanup() {
    emptyDirSync(this.updateDirectory);
  }

  private getExecutablePath(path: string) {
    const pathParts = path.split('.');

    pathParts.pop();
    pathParts.push('exe');

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
    this._updateInformation.url = `${this._configService.appConfig.webUrl}/update/${this._updateInformation.fileName.replace(`.${this._configService.appConfig.temporaryFileExtension}`, '.exe')}`;
    this._updateInformation.checksum = updateMetadata.checksum;

    this._updateDestinationPath = join(this.updateDirectory, this._updateInformation.fileName);
  }

  private setUpdateState(state: UpdateState) {
    this._updateState = state;

    this._windowService.windows.forEach(w => {
      w.webContents.send(IpcChannel.UpdateState, this.updateState, this._updateInformation.version);
    });
  }
}