import { Configuration } from '@root/configuration';
import { Product } from '@root/product';
import { PasswordEntry, IpcChannel } from '@shared-renderer/index';
import { IpcMainEvent, globalShortcut, ipcMain } from 'electron';
import { IConfigService } from '../config';
import { IDatabaseService } from '../database';
import { IEncryptionEventWrapper, MessageEventType } from '../encryption';
import { INativeApiService } from '../native';
import { ISendInputService, KeyCode } from '../send-input';
import { IWindowService } from '../window';
import { IWindow } from '../window/window-model';
import { IAutotypeService } from './autotype-service.model';

type AutotypeResult = {
	entries: PasswordEntry[];
	windowId: number;
};

enum AutocompleteMode {
	Full,
	PasswordOnly,
	UsernameOnly,
}

export class AutotypeService implements IAutotypeService {
	private _result: AutotypeResult[] = [];
	private _autocompleteMode = AutocompleteMode.Full;
	private _processRunning = false;

	private get _windows(): IWindow[] {
		return this._windowService.windows;
	}

	constructor(
		@IWindowService private readonly _windowService: IWindowService,
		@IDatabaseService private readonly _databaseService: IDatabaseService,
		@IEncryptionEventWrapper
		private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
		@ISendInputService private readonly _sendInputService: ISendInputService,
		@IConfigService private readonly _configService: IConfigService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {
		ipcMain.on(
			IpcChannel.AutotypeEntrySelected,
			(event: IpcMainEvent, entry: PasswordEntry) => {
				const browserWindow = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				).browserWindow;
				browserWindow.blur();
				browserWindow.hide();
				this.typeLoginDetails(entry);
			},
		);

		ipcMain.handle(
			IpcChannel.ChangeEncryptionSettings,
			(_, form: Partial<Configuration>) => {
				this.changeEncryptionSettings(form);
			},
		);
	}

	registerAutocompleteShortcut(
		shortcut: string,
		usernameOnlyShortcut: string,
		passwordOnlyShortcut: string,
	) {
		this.unregisterAutocompleteShortcut(
			this._configService.appConfig.autocompleteShortcut,
			this._configService.appConfig.autocompleteUsernameOnlyShortcut,
			this._configService.appConfig.autocompletePasswordOnlyShortcut,
		);
		globalShortcut.register(shortcut, () => {
			this._autocompleteMode = AutocompleteMode.Full;
			this.autotypeEntry();
		});

		globalShortcut.register(usernameOnlyShortcut, () => {
			this._autocompleteMode = AutocompleteMode.UsernameOnly;
			this.autotypeEntry();
		});

		globalShortcut.register(passwordOnlyShortcut, () => {
			this._autocompleteMode = AutocompleteMode.PasswordOnly;
			this.autotypeEntry();
		});
	}

	autotypeEntry() {
		if (this._processRunning) {
			return;
		}

		this._processRunning = true;
		const activeWindowTitle = this._nativeApiService.getActiveWindowTitle();

		this._result = [];
		// stop running listeners
		this._windows.forEach((win) => {
			if (win.autocompleteListener)
				win.browserWindow.webContents.off(
					'ipc-message',
					win.autocompleteListener,
				);
			win.autocompleteListener = null;
		});

		this._windowService.vaultWindows.forEach((win) => {
			this.addWindowHandler(win);
		});

		// stop active autotype if entry select window is close
		this._windowService.getWindow(1).on('hide', () => {
			this._processRunning = false;
		});

		this._windows.forEach((win) => {
			win.browserWindow.webContents.send(
				IpcChannel.GetAutotypeFoundEntry,
				activeWindowTitle,
			);
		});
	}

	private unregisterAutocompleteShortcut(
		shortcut: string,
		usernameOnlyShortcut: string,
		passwordOnlyShortcut: string,
	) {
		globalShortcut.unregister(shortcut);
		globalShortcut.unregister(usernameOnlyShortcut);
		globalShortcut.unregister(passwordOnlyShortcut);
	}

	private addWindowHandler(win: IWindow) {
		const listener = (
			event: Electron.Event,
			channel: string,
			entries: PasswordEntry[],
		) => {
			if (channel !== IpcChannel.AutocompleteEntry) return;

			try {
				this._result.push({
					entries: entries,
					windowId: (event as IpcMainEvent).sender.id,
				});

				if (this._windows.length - 1 === this._result.length) {
					const foundEntries: PasswordEntry[] = this._result.reduce(
						(arr, current) => [...arr, ...current.entries],
						[],
					);

					switch (foundEntries.length) {
						case 0:
							// if there are no unlocked databases restore all windows
							const dbContextWindows = this._windows.filter(
								(x) =>
									x.browserWindow.id !== this._windowService.getWindow(1).id,
							);
							if (
								dbContextWindows.length === 0 ||
								dbContextWindows.every(
									(x) =>
										this._databaseService.getPassword(x.browserWindow.id) ===
										null,
								)
							) {
								dbContextWindows.forEach((window) => {
									if (window.browserWindow.isMinimized()) {
										window.browserWindow.restore();
									}

									window.browserWindow.focus();
								});
							}
							this._processRunning = false;
							break;
						case 1:
							const entry = foundEntries[0];
							this.typeLoginDetails(entry);
							break;
						default:
							const entrySelectWindow = this._windowService.getWindow(1);
							entrySelectWindow.webContents.send(
								IpcChannel.SendMatchingEntries,
								foundEntries,
							);
							entrySelectWindow.show();
							entrySelectWindow.focus();
					}
				}
			} catch (err) {
				this._processRunning = false;
				this._result = [];
			}
		};

		win.autocompleteListener = listener;
		win.browserWindow.webContents.on('ipc-message', listener);
	}

	private async typeLoginDetails(entry: PasswordEntry): Promise<void> {
		const windowId = this._result.find((x) =>
			x.entries.find((e) => e.id === entry.id),
		).windowId;
		const window = this._windowService.getWindowByWebContentsId(windowId);

		const encryptionEvent = {
			type: MessageEventType.DecryptString,
			encrypted: entry.password,
		};

		const payload = (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			window.key,
		)) as { decrypted: string };
		await this._sendInputService.sleep(200);

		switch (this._autocompleteMode) {
			case AutocompleteMode.Full:
				if (entry.username) {
					await this._sendInputService.typeWord(entry.username);
				}
				await this._sendInputService.pressKey(KeyCode.TAB);
				await this._sendInputService.typeWord(payload.decrypted);
				await this._sendInputService.pressKey(KeyCode.ENTER);
				break;
			case AutocompleteMode.UsernameOnly:
				if (entry.username) {
					await this._sendInputService.typeWord(entry.username);
				}
				break;
			case AutocompleteMode.PasswordOnly:
				await this._sendInputService.typeWord(payload.decrypted);
			default:
				break;
		}

		this._processRunning = false;
		this._result = [];
	}

	private changeEncryptionSettings(settings: Partial<Product>) {
		if (
			settings.autoTypeEnabled ??
			this._configService.appConfig.autoTypeEnabled
		) {
			this.registerAutocompleteShortcut(
				settings.autocompleteShortcut ??
					this._configService.appConfig.autocompleteShortcut,
				settings.autocompleteUsernameOnlyShortcut ??
					this._configService.appConfig.autocompleteUsernameOnlyShortcut,
				settings.autocompletePasswordOnlyShortcut ??
					this._configService.appConfig.autocompletePasswordOnlyShortcut,
			);
		} else {
			this.unregisterAutocompleteShortcut(
				this._configService.appConfig.autocompleteShortcut,
				this._configService.appConfig.autocompleteUsernameOnlyShortcut,
				this._configService.appConfig.autocompletePasswordOnlyShortcut,
			);
		}

		// this._configService.set({
		//   autoTypeEnabled: settings.autoTypeEnabled ?? this._configService.appConfig.autoTypeEnabled,
		//   autocompleteShortcut: settings.autocompleteShortcut ?? this._configService.appConfig.autocompleteShortcut,
		//   autocompleteUsernameOnlyShortcut: settings.autocompleteUsernameOnlyShortcut ?? this._configService.appConfig.autocompleteUsernameOnlyShortcut,
		//   autocompletePasswordOnlyShortcut: settings.autocompletePasswordOnlyShortcut ?? this._configService.appConfig.autocompletePasswordOnlyShortcut
		// });
	}
}
