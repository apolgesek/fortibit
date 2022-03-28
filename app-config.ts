import { IProduct } from './product';
export interface IAppConfig extends Partial<IProduct> {
  clipboardClearTimeMs: number;
  autocompleteShortcut: string;
  fileExtension: string;
  autocompleteRegistered: boolean;
  version?: string;
  electronVersion?: string;
  nodeVersion?: string;
  os?: string;
  commit?: string;
}