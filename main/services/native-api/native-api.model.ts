import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const INativeApiService = createServiceDecorator<INativeApiService>('nativeApiService');

export interface INativeApiService {
  pressPhraseKey(char: string): void;
  pressKey(key: number): void;
  getActiveWindowTitle(): string;
}