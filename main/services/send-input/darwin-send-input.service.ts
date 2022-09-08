import { INativeApiService } from '../native';
import { ISendInputService } from './send-input.model';

export class DarwinSendInputService implements ISendInputService {
  private readonly _keypressDelayMs = 0;

  constructor(@INativeApiService private readonly _nativeApiService: INativeApiService) {}

  async typeWord(word: string) {
    this._nativeApiService.pressPhraseKey(word);
  }

  pressKey(key: number) {
    this._nativeApiService.pressKey(key);
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}