import { IProduct } from './product';

export interface IEncryptionSettings {
  passwordLength: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  specialChars: boolean;
}

export interface IAppConfig extends Partial<IProduct> {
  clipboardClearTimeMs: number;
  autocompleteShortcut: string;
  fileExtension: string;
  version?: string;
  electronVersion?: string;
  nodeVersion?: string;
  os?: string;
  commit?: string;
  encryption?: IEncryptionSettings;
}