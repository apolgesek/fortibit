import { IEncryptionSettings } from "./app-config";

export interface IProduct {
  name: string;
  temporaryFileExtension: string;
  commit: string;
  webUrl: string;
  staticContentUrl: string;
  updateUrl: string;
  leakedPasswordsUrl: string;
  compressionEnabled: boolean;
  encryption: IEncryptionSettings;
  idleSeconds: number;
  lockOnSystemLock: boolean;
  displayIcons: boolean;
}