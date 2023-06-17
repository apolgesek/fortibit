import { createServiceDecorator } from '../../dependency-injection';

export const IClipboardService = createServiceDecorator<IClipboardService>('clipboardService');

export interface IClipboardService {
  write(text: string): void;
  clear(): void;
}