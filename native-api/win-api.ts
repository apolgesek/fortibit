import { INativeApi } from './native-api.model';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fbitNative = require('./fbitnative/build/Release/FbitWin');

export class WinApi implements INativeApi {
  pressPhraseKey(char: string): void {
    fbitNative.pressPhraseKey(char.charCodeAt(0));
  }

  pressKey(key: number): void {
    fbitNative.pressKey(key);
  }

  getActiveWindowTitle(): string {
    return fbitNative.getActiveWindowTitle();
  }
}