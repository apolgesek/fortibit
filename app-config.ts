import { IProduct } from './product';

export interface IEncryptionSettings {
  passwordLength: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  specialChars: boolean;
}

export interface IAppConfig extends Partial<IProduct> {
  autocompleteShortcut: string;
  autocompletePasswordOnlyShortcut: string;
  fileExtension: string;
  workspaces: any;
  version?: string;
  electronVersion?: string;
  nodeVersion?: string;
  chromiumVersion?: string;
  os?: string;
  commit?: string;
  encryption?: IEncryptionSettings;
  biometricsProtectedFiles?: string[];
}