import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const INativeApiService = createServiceDecorator<INativeApiService>('nativeApiService');

export interface INativeApiService {
  pressPhraseKey(char: string): void;
  pressKey(key: number): void;
  getActiveWindowTitle(): string;
  setLivePreviewBitmap(handle: Buffer, path: string): number;
  setThumbnailBitmap(handle: Buffer, path: string): number;
  setIconicBitmap(handle: Buffer): number;
  unsetIconicBitmap(handle: Buffer): number;
  verifySignature(path: string, subject: string): boolean;
}