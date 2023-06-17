import * as merge from 'deepmerge';
import { app, ipcMain, nativeTheme } from 'electron';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { writeFileSync } from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import { IAppConfig } from '../../../app-config';
import { IProduct } from '../../../product';
import { IpcChannel } from '../../../shared-models';
import { INativeApiService } from '../native';
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

  constructor(@INativeApiService private readonly _nativeApiService: INativeApiService) {
    const dir = join(app.getPath('appData'), app.getName(), 'config');
    const productPath = join(dir, 'product.json');
    const workspacePath = join(dir, 'workspaces.json');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const productFileContent = readFileSync(join(global['__basedir'], 'product.json'), { encoding: 'utf8' });
    if (!existsSync(productPath)) {
      writeFileSync(productPath, productFileContent);
    }

    if (!existsSync(workspacePath)) {
      const fileContent = readFileSync(join(global['__basedir'], 'workspaces.json'), { encoding: 'utf8' });
      writeFileSync(workspacePath, fileContent);
    }

    this._productPath = productPath;
    this._workspacesPath = workspacePath;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const productInformation: IProduct = merge(JSON.parse(productFileContent), require(this._productPath));
    const workspacesInformation: any = require(this._workspacesPath);

    this._appConfig = {
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromiumVersion: process.versions.chrome,
      os: `${os.type()} ${os.release()}`,
      fileExtension: 'fbit',
      temporaryFileExtension: 'tmp',
      workspaces: workspacesInformation,
      name: productInformation.name,
      commit: productInformation.commit,
      updateUrl: productInformation.updateUrl,
      webUrl: productInformation.webUrl,
      iconServiceUrl: productInformation.iconServiceUrl,
      signatureSubject: productInformation.signatureSubject,
      leakedPasswordsUrl: productInformation.leakedPasswordsUrl,
      compressionEnabled: productInformation.compressionEnabled ?? false,
      autocompleteShortcut: productInformation.autocompleteShortcut ?? process.platform === 'win32' ? 'Alt+\\' : 'Option+\\',
      autocompletePasswordOnlyShortcut: productInformation.autocompletePasswordOnlyShortcut ?? process.platform === 'win32' ? 'Ctrl+Alt+\\' : 'Command+Option+\\',
      clipboardClearTimeMs: productInformation.clipboardClearTimeMs ?? 15000,
      biometricsAuthenticationEnabled: productInformation.biometricsAuthenticationEnabled ?? false,
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
      theme: productInformation.theme ?? 'light',
      biometricsProtectedFiles: []
    };

    ipcMain.handle(IpcChannel.GetAppConfig, async () => {
      const paths = await this._nativeApiService.listCredentials();
      this.appConfig.biometricsProtectedFiles = paths;

      return this.appConfig;
    });
  }

  set(settings: Partial<IAppConfig>) {
    this._appConfig = { ...this._appConfig, ...settings };
    const excludedKeys: (keyof IAppConfig)[] = [
      'version',
      'electronVersion',
      'nodeVersion',
      'chromiumVersion',
      'os',
      'fileExtension',
      'temporaryFileExtension',
      'workspaces'
    ];
    writeFileSync(this._productPath, JSON.stringify(this._appConfig, (key: keyof IAppConfig, value) => {
      if (excludedKeys.includes(key)) {
        return undefined;
      }

      return value;
    }));  
  }
}