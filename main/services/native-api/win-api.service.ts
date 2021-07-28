import { INativeApi } from './native-api.model';
export class WinApiService implements INativeApi {
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
}