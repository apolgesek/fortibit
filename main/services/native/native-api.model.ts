import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const INativeApiService = createServiceDecorator<INativeApiService>('nativeApiService');

export interface INativeApiService {
  pressPhraseKey(char: string): void;
  pressKey(key: number): void;
  setWindowAffinity(handle: Buffer, enabled: boolean): void;
  getActiveWindowTitle(): string;
  setLivePreviewBitmap(handle: Buffer, path: string, theme: 'light' | 'dark'): number;
  setThumbnailBitmap(handle: Buffer, path: string, theme: 'light' | 'dark'): number;
  setIconicBitmap(handle: Buffer): number;
  unsetIconicBitmap(handle: Buffer): number;
  verifySignature(path: string, subject: string): boolean;
  getPassword(windowHandleHex: Buffer, dbPath: string): Promise<string>;
  saveCredential(dbPath: string, password: string): void;
  removeCredential(dbPath: string): void;
  listCredentials(): Promise<string[]>;
}