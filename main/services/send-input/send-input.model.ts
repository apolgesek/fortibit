import { createServiceDecorator } from '../../di/create-service-decorator';

export const ISendInputService =
	createServiceDecorator<ISendInputService>('sendInputService');

export interface ISendInputService {
	typeWord(word: string): void;
	pressKey(key: number): void;
	sleep(ms: number): void;
}
