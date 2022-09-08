import { execSync } from 'child_process';
import { INativeApiService } from './native-api.model';

export class DarwinApiService implements INativeApiService {
  pressPhraseKey(char: string): void {
    try {
      execSync(`osascript SendString.scpt "${char}"`, { cwd: __dirname });
    } catch (error) {
      console.log(error);
    }
  }

  pressKey(key: number): void {
    try {
      execSync(`echo "tell application \\"System Events\\" to key code ${key}" | osascript`);
    } catch (error) {
      console.log(error);
    }
  }

  getActiveWindowTitle(): string {
    try {
        const title = execSync('osascript GetActiveWindowTitle.scpt', { cwd: __dirname });

        return title.toString('utf-8')
    } catch (error) {
        console.log(error);
    }
  }

  setLivePreviewBitmap(handle: Buffer, path: string): number {
    return 0;
  }

  setThumbnailBitmap(handle: Buffer, path: string): number {
    return 0;
  }

  setIconicBitmap(handle: Buffer): number {
    return 0;
  }

  unsetIconicBitmap(handle: Buffer): number {
    return 0;
  }
}