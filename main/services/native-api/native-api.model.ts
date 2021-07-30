export interface INativeApi {
  pressPhraseKey(char: string): void;
  pressKey(key: number): void;
  getActiveWindowTitle(): string;
}