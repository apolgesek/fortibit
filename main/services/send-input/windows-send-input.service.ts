import { INativeApiService } from '../native';
import { ISendInputService } from './send-input.model';

export class WindowsSendInputService implements ISendInputService {
  private readonly _keypressDelayMs = 0;

  constructor(@INativeApiService private readonly _nativeApiService: INativeApiService) {}

  async typeWord(word: string) {
    for (const char of word.split('')) {
      this._nativeApiService.pressPhraseKey(char);
      await this.sleep(this._keypressDelayMs);
    }
  }

  pressKey(key: number) {
    this._nativeApiService.pressKey(key);
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}