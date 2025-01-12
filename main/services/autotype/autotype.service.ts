import { IAutotypeService } from '@root/main/services/autotype';
import { IConfigService } from '@root/main/services/config';
import { IDatabaseService } from '@root/main/services/database';
import {
	IEncryptionEventWrapper,
	MessageEventType,
} from '@root/main/services/encryption';
import { INativeApiService } from '@root/main/services/native';
import { ISendInputService, KeyCode } from '@root/main/services/send-input';
import { IWindow, IWindowService } from '@root/main/services/window';
import { Product } from '@root/product';
import { IpcChannel, PasswordEntry } from '@shared-renderer/index';
import { BrowserWindow, IpcMainEvent, globalShortcut } from 'electron';

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

	constructor(
		@IWindowService private readonly _windowService: IWindowService,
		@IDatabaseService private readonly _databaseService: IDatabaseService,
		@IEncryptionEventWrapper
		private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
		@ISendInputService private readonly _sendInputService: ISendInputService,
		@IConfigService private readonly _configService: IConfigService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {}

	changeEncryptionSettings(settings: Partial<Product>) {
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
		this._windowService.vaultWindows.forEach((win) => {
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

		// stop active autotype if entry select window is closed
		this._windowService.getWindow(1)?.on('hide', () => {
			this._processRunning = false;
		});

		this._windowService.sendMessageToAll(
			IpcChannel.GetAutotypeFoundEntry,
			activeWindowTitle,
		);
	}

	async typeLoginDetails(entry: PasswordEntry): Promise<void> {
		const windowId = this._result.find((x) =>
			x.entries.find((e) => e.id === entry.id),
		)?.windowId;

		if (!windowId) {
			throw new Error('Window not found');
		}

		const window = this._windowService.getWindowByWebContentsId(windowId);

		const encryptionEvent = {
			type: MessageEventType.DecryptString,
			encrypted: entry.password,
		};

		const payload = (await this._encryptionEventWrapper.processEventAsync(
			encryptionEvent,
			window.key as string,
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
				break;
			default:
				break;
		}

		this._processRunning = false;
		this._result = [];
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

				if (this._windowService.vaultWindows.length === this._result.length) {
					const foundEntries: PasswordEntry[] = this._result.reduce(
						(arr, current) => [...arr, ...current.entries],
						[],
					);

					switch (foundEntries.length) {
						case 0:
							this.handleNoEntriesFound();
							break;
						case 1:
							this.handleOneEntryFound(foundEntries);
							break;
						default:
							this.handleMultipleEntriesFound(foundEntries);
					}
				}
			} catch {
				this._processRunning = false;
				this._result = [];
			}
		};

		win.autocompleteListener = listener;
		win.browserWindow.webContents.on('ipc-message', listener);
	}

	private handleOneEntryFound(foundEntries: PasswordEntry[]) {
		const entry = foundEntries[0];
		this.typeLoginDetails(entry);
	}

	private handleMultipleEntriesFound(foundEntries: PasswordEntry[]) {
		const entrySelectWindow = this._windowService.getWindow(1) as BrowserWindow;

		this._windowService.sendMessage(
			entrySelectWindow,
			IpcChannel.SendMatchingEntries,
			foundEntries,
		);

		if (process.platform === 'darwin') {
			entrySelectWindow.setVisibleOnAllWorkspaces(true, {
				visibleOnFullScreen: true,
			});
			entrySelectWindow.setAlwaysOnTop(true, 'screen-saver', 1);
		}
		entrySelectWindow.show();
		entrySelectWindow.focus();
	}

	private handleNoEntriesFound() {
		// if there are no unlocked databases restore all windows
		if (
			this._windowService.vaultWindows.length === 0 ||
			this._windowService.vaultWindows.every(
				(x) =>
					this._databaseService.getVaultPassword(x.browserWindow.id) === null,
			)
		) {
			this._windowService.vaultWindows.forEach((window) => {
				if (window.browserWindow.isMinimized()) {
					window.browserWindow.restore();
				}

				window.browserWindow.focus();
			});
		}

		this._processRunning = false;
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
}
