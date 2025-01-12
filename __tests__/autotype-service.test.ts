import { AutotypeService } from '@root/main/services/autotype';
import { ConfigService } from '@root/main/services/config';
import { DatabaseService } from '@root/main/services/database';
import { DialogService } from '@root/main/services/dialog';
import { DownloadService } from '@root/main/services/download';
import {
	EncryptionEventService,
	EncryptionEventWrapper,
} from '@root/main/services/encryption';
import { FileService } from '@root/main/services/file';
import { IconService } from '@root/main/services/icon';
import { Win32ApiService } from '@root/main/services/native';
import { PerformanceService } from '@root/main/services/performance';
import { Win32SendInputService } from '@root/main/services/send-input';
import { WebApiService } from '@root/main/services/web-api';
import { IWindow, WindowService } from '@root/main/services/window';
import { MessageBroker } from '@root/out-tsc/main/ipc/message-broker/message-broker';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { PasswordEntry } from '@shared-renderer/password-entry.model';

type WindowMock = {
	title: string;
	username: string;
	password: string;
};

jest.mock('@root/main/ipc', () => jest.fn());
jest.mock('electron', () => {
	return {
		IpcMainEvent: jest.fn(),
		globalShortcut: jest.fn(),
	};
});
jest.mock('@root/main/services/clipboard', () => {
	return {
		IClipboardService: jest.fn(),
		ClipboardService: jest.fn(),
	};
});
jest.mock('@root/main/services/export', () => {
	return {
		IExportService: jest.fn(),
		ExportService: jest.fn(),
	};
});
jest.mock('@root/main/services/import', () => {
	return {
		IImportService: jest.fn(),
		ImportService: jest.fn(),
	};
});
jest.mock('@root/main/services/config', () => {
	return {
		IConfigService: jest.fn(),
		ConfigService: jest.fn(),
	};
});
jest.mock('@root/main/services/performance', () => {
	return {
		IPerformanceService: jest.fn(),
		PerformanceService: jest.fn(),
	};
});
jest.mock('@root/main/services/file', () => {
	return {
		IFileService: jest.fn(),
		FileService: jest.fn(),
	};
});
jest.mock('@root/main/services/icon', () => {
	return {
		IIconService: jest.fn(),
		IconService: jest.fn(),
	};
});
jest.mock('@root/main/services/web-api', () => {
	return {
		IWebApiService: jest.fn(),
		WebApiService: jest.fn(),
	};
});
jest.mock('@root/main/services/encryption', () => {
	return {
		MessageEventType: { DecryptString: 'decryptString' },
		IEncryptionEventWrapper: jest.fn(),
		EncryptionEventWrapper: jest.fn().mockImplementation(() => {
			return {
				processEventAsync: jest.fn().mockResolvedValue({
					decrypted: 'password',
				}),
			};
		}),
		EncryptionEventService: jest.fn(),
	};
});
jest.mock('@root/main/services/database', () => {
	return {
		DatabaseService: jest.fn(),
		IDatabaseService: jest.fn(),
	};
});
jest.mock('@root/main/services/native', () => {
	return {
		INativeApiService: jest.fn(),
		Win32ApiService: jest.fn().mockImplementation(() => {
			return {
				getActiveWindowTitle: () => 'test.com',
			};
		}),
	};
});
jest.mock('@root/main/services/send-input', () => {
	return {
		KeyCode: {
			TAB: 0,
			ENTER: 1,
		},
		ISendInputService: jest.fn(),
		Win32SendInputService: jest.fn().mockImplementation(() => {
			return {
				sleep: jest.fn(() => Promise.resolve()),
				typeWord: jest.fn(() => Promise.resolve()),
				pressKey: jest.fn(() => Promise.resolve()),
			};
		}),
	};
});

jest.mock('@root/main/services/window', () => {
	return {
		IWindowService: jest.fn(),
		IWindow: jest.fn(),
		WindowService: jest.fn().mockImplementation(() => {
			const instance = (function () {
				return {
					getWindow: jest.fn().mockImplementation(() => {
						return {
							on: jest.fn(),
							webContents: {
								send: jest.fn(),
							},
							show: jest.fn(),
							focus: jest.fn(),
						};
					}),
					getWindowByWebContentsId: () => ({ key: 'key' }),
					sendMessage: jest.fn(),
					sendMessageToAll: jest.fn(),
				};
			})();

			Object.defineProperty(instance, 'vaultWindows', {
				get: jest.fn(),
				configurable: true,
			});

			return instance;
		}),
	};
});

function setup() {
	const messageBroker = new MessageBroker();
	const configService = new ConfigService();
	const nativeApiService = new Win32ApiService();
	const performanceService = new PerformanceService();
	const downloadService = new DownloadService();
	const fileService = new FileService();
	const dialogService = new DialogService(configService);
	const windowService = new WindowService(
		messageBroker,
		configService,
		performanceService,
		nativeApiService,
	);
	const iconService = new IconService(
		configService,
		downloadService,
		windowService,
	);
	const webApiService = new WebApiService(configService, windowService);
	const encryptionEventWrapper = new EncryptionEventWrapper(configService);
	const encryptionEventService = new EncryptionEventService(
		encryptionEventWrapper,
	);
	const sendInputService = new Win32SendInputService(nativeApiService);
	const databaseService = new DatabaseService(
		configService,
		windowService,
		iconService,
		webApiService,
		nativeApiService,
		encryptionEventService,
		fileService,
		dialogService,
	);

	return {
		configService,
		nativeApiService,
		performanceService,
		fileService,
		windowService,
		iconService,
		webApiService,
		encryptionEventWrapper,
		encryptionEventService,
		sendInputService,
		databaseService,
	};
}

function setupVaultWindows(windows: WindowMock[][]) {
	return windows.map((vault, i) => {
		return {
			key: 'random',
			browserWindow: {
				webContents: {
					on: (
						event: string,
						listener: (
							event: Electron.Event,
							channel: string,
							entries: Partial<PasswordEntry>[],
						) => void,
					) => {
						if (event === 'ipc-message') {
							setTimeout(() => {
								listener(
									{ sender: { id: i + 2 } } as unknown as Electron.Event,
									IpcChannel.AutocompleteEntry,
									vault,
								);
							});
						}
					},
					off: jest.fn(),
					send: jest.fn(),
				},
			},
		};
	});
}

const cases: [
	name: string,
	value: WindowMock[][],
	expectedResultCount: number,
][] = [
	[
		'Should show entry selection window if multiple entries found in one vault',
		[
			[
				{
					title: 'test.com logowanie',
					username: 'username',
					password: 'password',
				},
				{
					title: 'test.com',
					username: 'username',
					password: 'password',
				},
			],
		],
		1,
	],
	[
		'Should show entry selection window if multiple entries found in multiple vaults',
		[
			[
				{
					title: 'test.com logowanie',
					username: 'username',
					password: 'password',
				},
			],
			[
				{
					title: 'test.com',
					username: 'username',
					password: 'password',
				},
			],
		],
		2,
	],
];

describe('Autotype service', () => {
	test('Should do nothing if no entries found', async () => {
		// Arrange
		const {
			configService,
			nativeApiService,
			windowService,
			encryptionEventWrapper,
			sendInputService,
			databaseService,
		} = setup();

		jest
			.spyOn(windowService, 'vaultWindows', 'get')
			.mockReturnValue(setupVaultWindows([[]]) as unknown as IWindow[]);

		const autotypeService = new AutotypeService(
			windowService,
			databaseService,
			encryptionEventWrapper,
			sendInputService,
			configService,
			nativeApiService,
		);

		const typeLoginDetailsSpy = jest.spyOn(autotypeService, 'typeLoginDetails');
		const getWindowSpy = jest.spyOn(windowService, 'getWindow');

		// Act
		autotypeService.autotypeEntry();

		await new Promise((resolve) => setTimeout(resolve));

		// Assert
		expect(typeLoginDetailsSpy).not.toHaveBeenCalled();
		expect(getWindowSpy.mock.results.length).toBe(1);
	});

	test('Should type login details if one entry found', async () => {
		// Arrange
		const {
			configService,
			nativeApiService,
			windowService,
			encryptionEventWrapper,
			sendInputService,
			databaseService,
		} = setup();

		jest.spyOn(windowService, 'vaultWindows', 'get').mockReturnValue(
			setupVaultWindows([
				[
					{
						title: 'test.com logowanie',
						username: 'username',
						password: 'password',
					},
				],
			]) as unknown as IWindow[],
		);

		const autotypeService = new AutotypeService(
			windowService,
			databaseService,
			encryptionEventWrapper,
			sendInputService,
			configService,
			nativeApiService,
		);

		const typeLoginDetailsSpy = jest.spyOn(autotypeService, 'typeLoginDetails');
		const sleepSpy = jest.spyOn(sendInputService, 'sleep');
		const typeWordSpy = jest.spyOn(sendInputService, 'typeWord');
		const pressKeySpy = jest.spyOn(sendInputService, 'pressKey');

		// Act
		autotypeService.autotypeEntry();

		// wait for async operations to finish
		await new Promise((resolve) => setTimeout(resolve));

		// Assert
		expect(typeLoginDetailsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'test.com logowanie',
			}),
		);
		expect(sleepSpy).toHaveBeenCalledWith(200);
		expect(typeWordSpy).toHaveBeenCalledWith('username');
		expect(pressKeySpy).toHaveBeenCalledWith(0);
		expect(typeWordSpy).toHaveBeenCalledWith('password');
		expect(pressKeySpy).toHaveBeenCalledWith(1);
	});

	test.each(cases)('%p', async (_, value, resultCount) => {
		// Arrange
		const {
			configService,
			nativeApiService,
			windowService,
			encryptionEventWrapper,
			sendInputService,
			databaseService,
		} = setup();

		const vaultWindowsSpy = jest
			.spyOn(windowService, 'vaultWindows', 'get')
			.mockReturnValue(setupVaultWindows(value) as unknown as IWindow[]);

		const autotypeService = new AutotypeService(
			windowService,
			databaseService,
			encryptionEventWrapper,
			sendInputService,
			configService,
			nativeApiService,
		);

		const getWindowSpy = jest.spyOn(windowService, 'getWindow');
		const sendMessageSpy = jest.spyOn(windowService, 'sendMessage');

		// Act
		autotypeService.autotypeEntry();

		// wait for async operations to finish
		await new Promise((resolve) => setTimeout(resolve));
		const showSpy = jest.spyOn(getWindowSpy.mock.results[1].value, 'show');
		const focusSpy = jest.spyOn(getWindowSpy.mock.results[1].value, 'focus');

		// Assert
		expect(
			vaultWindowsSpy.mock.results
				.at(-1)!
				.value.filter((x) => Boolean(x.autocompleteListener)).length,
		).toBe(resultCount);
		expect(sendMessageSpy).toHaveBeenCalledWith(
			expect.anything(),
			IpcChannel.SendMatchingEntries,
			[
				{
					title: 'test.com logowanie',
					username: 'username',
					password: 'password',
				},
				{
					title: 'test.com',
					username: 'username',
					password: 'password',
				},
			],
		);
		expect(showSpy).toHaveBeenCalled();
		expect(focusSpy).toHaveBeenCalled();
	});
});
