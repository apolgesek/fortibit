import { app } from 'electron';
import { writeFileSync } from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import { IAppConfig } from '../../../app-config';
import { IProduct } from '../../../product';
import { IConfigService } from './index';

export class ConfigService implements IConfigService {
  public get appConfig(): IAppConfig {
    return this._appConfig;
  }

  public get productPath(): string {
    return this._productPath;
  }

  private readonly _productPath = join(global['__basedir'], 'product.json');
  private _appConfig: IAppConfig;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const productInformation: IProduct = require(this._productPath);

    this._appConfig = {
      name: productInformation.name,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      os: `${os.type()} ${os.release()}`,
      commit: productInformation.commit,
      updateUrl: productInformation.updateUrl,
      webUrl: productInformation.webUrl,
      staticContentUrl: productInformation.staticContentUrl,
      leakedPasswordsUrl: productInformation.leakedPasswordsUrl,
      temporaryFileExtension: productInformation.temporaryFileExtension,
      compressionEnabled: productInformation.compressionEnabled,
      fileExtension: 'fbit',
      autocompleteRegistered: false,
      autocompleteShortcut: process.platform === 'win32' ? 'Alt+F' : 'Option+F',
      clipboardClearTimeMs: 15000,
      encryption: {
        lowercase: productInformation.encryption.lowercase ?? true,
        numbers: productInformation.encryption.numbers ?? true,
        uppercase: productInformation.encryption.uppercase ?? true,
        specialChars: productInformation.encryption.specialChars ?? true,
        passwordLength: productInformation.encryption.passwordLength ?? 15,
      },
      idleSeconds: productInformation.idleSeconds ?? 600,
      lockOnSystemLock: productInformation.lockOnSystemLock ?? true,
      displayIcons: productInformation.displayIcons ?? true
    };
  }

  set(settings: Partial<IAppConfig>) {  
    this._appConfig = { ...this._appConfig, ...settings };

    writeFileSync(this._productPath, JSON.stringify(this._appConfig));  
  }
}