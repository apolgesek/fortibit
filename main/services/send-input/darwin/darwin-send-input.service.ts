import { INativeApiService } from '@root/main/services/native';
import { ISendInputService } from '@root/main/services/send-input';

export class DarwinSendInputService implements ISendInputService {
	constructor(
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {}

	async typeWord(word: string) {
		this._nativeApiService.pressPhraseKey(word);
	}

	pressKey(key: number) {
		this._nativeApiService.pressKey(key);
	}

	sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
