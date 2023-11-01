import { IProduct } from './product';

export interface IAppConfig extends IProduct {
  fileExtension: string;
  version?: string;
  electronVersion?: string;
  nodeVersion?: string;
  chromiumVersion?: string;
  os?: string;
  e2eFilesPath: string;
}