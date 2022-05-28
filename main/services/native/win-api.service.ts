import { INativeApiService } from './native-api.model';

export class WinApiService implements INativeApiService {
  private readonly _instance;

  constructor() {
    this._instance = require('./fbitnative/build/Release/FbitWin');
  }

  pressPhraseKey(char: string): void {
    this._instance.pressPhraseKey(char.charCodeAt(0));
  }

  pressKey(key: number): void {
    this._instance.pressKey(key);
  }

  getActiveWindowTitle(): string {
    return this._instance.getActiveWindowTitle();
  }

  getLastActive(): any {
    return this._instance.getLastInputInfo();
  }

  setLivePreviewBitmap(handle: Buffer, path: string): number {
    return this._instance.setLivePreviewBitmap(handle, path);
  }

  setThumbnailBitmap(handle: Buffer, path: string): number {
    return this._instance.setThumbnailBitmap(handle, path);
  }

  setIconicBitmap(handle: Buffer): number {
    return this._instance.setIconicBitmap(handle);
  }

  unsetIconicBitmap(handle: Buffer): number {
    return this._instance.unsetIconicBitmap(handle);
  }
}