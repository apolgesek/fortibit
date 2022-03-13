import { ipcMain } from 'electron';
import { IpcChannel } from '../../../shared-models';
import { IConfigService } from '../config';
import { IClipboardService } from './clipboard-service.model';
import { clipboard } from 'electron';

export class ClipboardService implements IClipboardService {
  private _clearClipboardTimeout: NodeJS.Timeout;

  constructor(@IConfigService private readonly _configService: IConfigService) {
    ipcMain.handle(IpcChannel.CopyCliboard, async (_, value: string) => {
      return this.write(value);
    });
  }

  async write(content: string): Promise<boolean> {
    clearTimeout(this._clearClipboardTimeout);
    clipboard.writeText(content);

    this._clearClipboardTimeout = setTimeout(() => {
      clipboard.clear();
    }, this._configService.appConfig.clipboardClearTimeMs);

    return true;
  }
}