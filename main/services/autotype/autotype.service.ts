import { globalShortcut, ipcMain, IpcMainEvent } from "electron";
import { IAppConfig } from "../../../app-config";
import { IProduct } from "../../../product";
import { IPasswordEntry, IpcChannel } from "../../../shared-models";
import { IConfigService } from "../config";
import { IEncryptionEventWrapper, MessageEventType } from "../encryption";
import { INativeApiService } from "../native";
import { ISendInputService, KeyCode } from "../send-input";
import { IWindowService } from '../window';
import { IWindow } from "../window/window-model";
import { IAutotypeService } from "./autotype-service.model";

interface IAutotypeResult {
  entries: IPasswordEntry[];
  windowId: number;
}

export class AutotypeService implements IAutotypeService {
  private _result: IAutotypeResult[] = [];
  private get _windows(): IWindow[] {
    return this._windowService.windows;
  }

  constructor(
    @IWindowService private readonly _windowService: IWindowService,
    @IEncryptionEventWrapper private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
    @ISendInputService private readonly _sendInputService: ISendInputService,
    @IConfigService private readonly _configService: IConfigService,
    @INativeApiService private readonly _nativeApiService: INativeApiService
  ) {
    ipcMain.on(IpcChannel.AutotypeEntrySelected, (event: IpcMainEvent, entry: IPasswordEntry) => {
      const browserWindow = this._windowService.getWindowByWebContentsId(event.sender.id).browserWindow;
      browserWindow.blur();
      browserWindow.hide();
      this.typeLoginDetails(entry);
    });

    ipcMain.on(IpcChannel.ChangeEncryptionSettings, (_, form: Partial<IAppConfig>) => {
      this.changeEncryptionSettings(form);
    });
  }

  registerAutocompleteShortcut() {
    globalShortcut.register(this._configService.appConfig.autocompleteShortcut, () => {
      const activeWindowTitle = this._nativeApiService.getActiveWindowTitle();
      this.registerAutotypeHandler(activeWindowTitle);
    });
  }

  unregisterAutocompleteShortcut() {
    globalShortcut.unregister(this._configService.appConfig.autocompleteShortcut);
  }

  registerAutotypeHandler(title: string) {
    this._result = [];
    // stop running listeners
    this._windows.forEach(win => {
      if (win.autocompleteListener)
      win.browserWindow.webContents.off('ipc-message', win.autocompleteListener);
      win.autocompleteListener = null;
    });

    this._windows.forEach((win) => {
      if (win.browserWindow.id === this._windowService.getWindow(1).id) {
        return;
      }

      const listener = (event: Electron.Event, channel: string, entries: IPasswordEntry[]) => {
        try {
          if (channel === IpcChannel.AutocompleteEntry) {
            this._result.push({ entries: entries, windowId: (event as IpcMainEvent).sender.id });
  
            if (this._windows.length - 1 === this._result.length) {
              const foundEntries: IPasswordEntry[] = this._result.reduce((arr, current) => ([...arr, ...current.entries]), []);
              
              if (foundEntries.length > 1) {
                const entrySelectWindow = this._windowService.getWindow(1);
                entrySelectWindow.webContents.send(IpcChannel.SendMatchingEntries, foundEntries);
                entrySelectWindow.show();
                entrySelectWindow.focus();
              } else {
                const entry = foundEntries[0];
                this.typeLoginDetails(entry);
              }
            }
          }
        } catch (err) {
          this._result = [];
        }
      };

      win.autocompleteListener = listener;
      win.browserWindow.webContents.on('ipc-message', listener);
    });

    this._windows.forEach((win) => {
      win.browserWindow.webContents.send(IpcChannel.GetAutotypeFoundEntry, title);
    });
  }

  private async typeLoginDetails(entry: IPasswordEntry): Promise<void> {
    const windowId = this._result.find(x => x.entries.find(e => e.id === entry.id)).windowId;
    const window = this._windowService.getWindowByWebContentsId(windowId);

    const encryptionEvent = {
      type: MessageEventType.DecryptString,
      encrypted: entry.password,
    };
    
    const payload = await this._encryptionEventWrapper.processEventAsync(encryptionEvent, window.key) as { decrypted: string };
    await this._sendInputService.sleep(200);

    if (entry.username) {
      await this._sendInputService.typeWord(entry.username);
      await this._sendInputService.pressKey(KeyCode.TAB);
    }

    await this._sendInputService.typeWord(payload.decrypted);
    await this._sendInputService.pressKey(KeyCode.ENTER);

    this._result = [];
  }

  private changeEncryptionSettings(settings: Partial<IProduct>) {
    if (settings.autoTypeEnabled !== this._configService.appConfig.autoTypeEnabled) {
      if (settings.autoTypeEnabled) {
        this.registerAutocompleteShortcut();
      } else {
        this.unregisterAutocompleteShortcut();
      }
    }
  
    this._configService.set(settings);
  }
}