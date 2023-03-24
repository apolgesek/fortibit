import { app } from 'electron';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
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

  public get workspacesPath(): string {
    return this._workspacesPath;
  }

  private readonly _productPath: string;
  private readonly _workspacesPath: string;
  private _appConfig: IAppConfig;

  constructor() {
    const dir = join(app.getPath('appData'), app.getName(), 'config');
    const productPath = join(dir, 'product.json');
    const workspacePath = join(dir, 'workspaces.json');

    if (!existsSync(productPath)) {
      mkdirSync(dir, { recursive: true });
      copyFileSync(join(global['__basedir'], 'product.json'), productPath);
    }

    this._productPath = productPath;
    this._workspacesPath = workspacePath;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const productInformation: IProduct = require(this._productPath);
    const workspacesInformation: any = require(this._workspacesPath);

    this._appConfig = {
      name: productInformation.name,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      os: `${os.type()} ${os.release()}`,
      commit: productInformation.commit,
      updateUrl: productInformation.updateUrl,
      webUrl: productInformation.webUrl,
      signatureSubject: productInformation.signatureSubject,
      leakedPasswordsUrl: productInformation.leakedPasswordsUrl,
      temporaryFileExtension: productInformation.temporaryFileExtension,
      compressionEnabled: productInformation.compressionEnabled,
      fileExtension: 'fbit',
      autocompleteShortcut: productInformation.autocompleteShortcut ?? process.platform === 'win32' ? 'Alt+\\' : 'Option+\\',
      autocompletePasswordOnlyShortcut: productInformation.autocompletePasswordOnlyShortcut ?? process.platform === 'win32' ? 'Ctrl+Alt+\\' : 'Command+Option+\\',
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
      saveOnLock: productInformation.saveOnLock ?? false,
      displayIcons: productInformation.displayIcons ?? true,
      autoTypeEnabled: productInformation.autoTypeEnabled ?? true,
      workspaces: workspacesInformation,
      theme: productInformation.theme
    };
  }

  set(settings: Partial<IAppConfig>) {  
    this._appConfig = { ...this._appConfig, ...settings };
    writeFileSync(this._productPath, JSON.stringify(this._appConfig));  
  }
}