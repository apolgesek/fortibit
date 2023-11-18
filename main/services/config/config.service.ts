import { IAppConfig } from '@root/app-config';
import { IProduct } from '@root/product';
import { IpcChannel, getDefaultConfig } from '@shared-renderer/index';
import * as merge from 'deepmerge';
import { IpcMainEvent, app, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { writeFileSync } from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
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

    this._appConfig = merge(getDefaultConfig(process.platform), {
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromiumVersion: process.versions.chrome,
      os: `${os.type()} ${os.release()}`,
      fileExtension: 'fbit',
      temporaryFileExtension: 'tmp',
      e2eFilesPath: process.env.E2E_FILES_PATH,
      workspaces: workspacesInformation,
      name: productInformation.name,
      commit: productInformation.commit,
      updateUrl: productInformation.updateUrl,
      webUrl: productInformation.webUrl,
      iconServiceUrl: productInformation.iconServiceUrl,
      signatureSubject: productInformation.signatureSubject,
      leakedPasswordsUrl: productInformation.leakedPasswordsUrl,
      compressionEnabled: productInformation.compressionEnabled,
      autocompleteShortcut: productInformation.autocompleteShortcut,
      autocompleteUsernameOnlyShortcut: productInformation.autocompleteUsernameOnlyShortcut,
      autocompletePasswordOnlyShortcut: productInformation.autocompletePasswordOnlyShortcut,
      clipboardClearTimeMs: productInformation.clipboardClearTimeMs,
      biometricsAuthenticationEnabled: productInformation.biometricsAuthenticationEnabled,
      encryption: {
        lowercase: productInformation.encryption.lowercase,
        numbers: productInformation.encryption.numbers,
        uppercase: productInformation.encryption.uppercase,
        specialChars: productInformation.encryption.specialChars,
        passwordLength: productInformation.encryption.passwordLength,
      },
      idleSeconds: productInformation.idleSeconds,
      lockOnSystemLock: productInformation.lockOnSystemLock,
      saveOnLock: productInformation.saveOnLock,
      displayIcons: productInformation.displayIcons,
      autoTypeEnabled: productInformation.autoTypeEnabled,
      theme: productInformation.theme ?? 'light',
      showInsecureUrlPrompt: productInformation.showInsecureUrlPrompt,
      biometricsProtectedFiles: [],
      protectWindowsFromCapture: productInformation.protectWindowsFromCapture
    } as IAppConfig);

    ipcMain.handle(IpcChannel.GetAppConfig, async () => {
      const paths = await this._nativeApiService.listCredentials();
      this.appConfig.biometricsProtectedFiles = paths;

      return this.appConfig;
    });

    ipcMain.on(IpcChannel.ConfigChanged, (_: IpcMainEvent, config: Partial<IAppConfig>) => {
      this.set(config);
    })
  }

  set(settings: Partial<IAppConfig>) {
    this._appConfig = { ...this._appConfig, ...settings };
    const excludedKeys: (keyof IAppConfig)[] = [
      'schemaVersion',
      'version',
      'electronVersion',
      'nodeVersion',
      'chromiumVersion',
      'os',
      'fileExtension',
      'temporaryFileExtension',
      'workspaces',
      'e2eFilesPath'
    ];
    writeFileSync(this._productPath, JSON.stringify(this._appConfig, (key: keyof IAppConfig, value) => {
      if (excludedKeys.includes(key)) {
        return undefined;
      }

      return value;
    }));  
  }
}