import { createServiceDecorator } from '../../di';

export const IClipboardService =
	createServiceDecorator<IClipboardService>('clipboardService');

export interface IClipboardService {
	write(text: string): void;
	clear(): void;
}
