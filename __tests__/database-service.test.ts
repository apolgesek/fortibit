import { MessageBroker } from '@root/main/ipc/message-broker';
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
import { WebApiService } from '@root/main/services/web-api';
import { WindowService } from '@root/main/services/window';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { join } from 'path';

jest.mock('@root/main/ipc', () => jest.fn());
jest.mock('electron', () => {
	return {
		app: {
			commandLine: {
				hasSwitch: jest.fn().mockReturnValue(false),
			},
		},
		powerMonitor: {
			addListener: jest.fn(),
		},
		safeStorage: {
			isEncryptionAvailable: jest.fn().mockReturnValue(true),
			encryptString: jest.fn().mockResolvedValue('encrypted'),
			decryptString: jest.fn().mockResolvedValue('decrypted'),
		},
		session: {
			defaultSession: {
				clearData: jest.fn().mockResolvedValue(null),
			},
		},
	};
});
jest.mock('@root/main/ipc/message-broker', () => {
	return {
		IMessageBroker: jest.fn(),
		MessageBroker: jest.fn(),
	};
});
jest.mock('@root/main/services/config', () => {
	return {
		IConfigService: jest.fn(),
		ConfigService: jest.fn().mockImplementation(() => {
			const instance = (function () {
				return {
					appConfig: {},
					tmpDir: 'tmpDir',
					workspacesPath: 'workspacesPath',
				};
			})();

			Object.defineProperty(instance, 'appConfig', {
				get: jest.fn().mockReturnValue({
					workspaces: { recentlyOpened: [] },
					fileExtension: 'fbit',
					temporaryFileExtension: 'tmp',
					biometricsProtectedFiles: [],
				}),
				configurable: true,
			});

			return instance;
		}),
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
		FileService: jest.fn().mockImplementation(() => {
			return {
				existsSync: jest.fn().mockReturnValue(true),
				writeSync: jest.fn(),
				readSync: jest.fn(),
				copySync: jest.fn(),
				renameSync: jest.fn(),
				unlinkSync: jest.fn(),
			};
		}),
	};
});
jest.mock('@root/main/services/icon', () => {
	return {
		IIconService: jest.fn(),
		IconService: jest.fn().mockImplementation(() => {
			return {
				fixIcon: jest.fn(),
				getIcons: jest.fn(),
			};
		}),
	};
});
jest.mock('@root/main/services/web-api', () => {
	return {
		IWebApiService: jest.fn(),
		WebApiService: jest.fn().mockImplementation(() => {
			return {
				checkSecureProtocol: jest.fn(),
				checkTfa: jest.fn(),
			};
		}),
	};
});
jest.mock('@root/main/services/download', () => {
	return {
		IDownloadService: jest.fn(),
		DownloadService: jest.fn(),
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
		IEncryptionEventService: jest.fn(),
		EncryptionEventService: jest.fn().mockImplementation(() => {
			return {
				decryptVaultData: jest.fn(),
				encryptVaultData: jest.fn(),
			};
		}),
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
jest.mock('@root/main/services/dialog', () => {
	return {
		IDialogService: jest.fn(),
		DialogService: jest.fn().mockImplementation(() => {
			return {
				showSaveFileDialog: jest
					.fn()
					.mockReturnValue({ canceled: false, filePath: '' }),
			};
		}),
	};
});
jest.mock('@root/main/services/autotype', () => {
	return {
		IAutoTypeService: jest.fn(),
		AutoTypeService: jest.fn(),
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
					getWindowByWebContentsId: jest.fn().mockReturnValue({
						key: '5fb71ba4f3bde831513ba0e780838f2f06dc818cc8a0049ce4ab79c71e54b553',
						browserWindow: null,
					}),
					getSecureKey: jest
						.fn()
						.mockReturnValue(
							'5fb71ba4f3bde831513ba0e780838f2f06dc818cc8a0049ce4ab79c71e54b553',
						),
					sendMessage: jest.fn(),
					sendMessageToAll: jest.fn(),
					setIdleTimer: jest.fn(),
					setTitle: jest.fn(),
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
	const nativeApiService = new Win32ApiService(configService);
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

	return {
		configService,
		windowService,
		iconService,
		webApiService,
		nativeApiService,
		encryptionEventService,
		fileService,
		dialogService,
	};
}

describe('Database service', () => {
	test('Should set vault path', async () => {
		global['__basedir'] = join(__dirname, 'config');

		const {
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		} = setup();

		const service = new DatabaseService(
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		);

		const path = await service.openDatabase(
			2,
			join(__dirname, 'files', 'open-database-test.fbit'),
		);

		expect(path).toBe(join(__dirname, 'files', 'open-database-test.fbit'));
	});

	test('Should throw auth error when decrypting a vault', async () => {
		global['__basedir'] = join(__dirname, 'config');

		const {
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		} = setup();

		const service = new DatabaseService(
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		);

		jest
			.spyOn(encryptionEventService, 'decryptVaultData')
			.mockResolvedValue({ error: 'Password is incorrect', decrypted: '' });
		const getFilePathSpy = jest
			.spyOn(service, 'getFilePath')
			.mockReturnValue('');

		const result = await service.decryptDatabase(2, 'test');

		expect(getFilePathSpy).toHaveBeenCalledWith(2);
		expect(result).toEqual({ error: 'Password is incorrect' });
	});

	test('Should decrypt a vault', async () => {
		global['__basedir'] = join(__dirname, 'config');

		const {
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		} = setup();

		const service = new DatabaseService(
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		);

		const decryptedPayload = JSON.stringify({ tables: { entries: [] } });

		const decryptVaultDataSpy = jest
			.spyOn(encryptionEventService, 'decryptVaultData')
			.mockResolvedValue({
				decrypted: decryptedPayload,
				error: '',
			});
		const getFilePathSpy = jest
			.spyOn(service, 'getFilePath')
			.mockReturnValue('');
		const setVaultPasswordSpy = jest
			.spyOn(service, 'setVaultPassword')
			.mockReturnValue();

		const result = await service.decryptDatabase(2, 'test');

		expect(getFilePathSpy).toHaveBeenCalledWith(2);
		expect(decryptVaultDataSpy).toHaveBeenCalled();
		expect(setVaultPasswordSpy).toHaveBeenCalledWith(2, 'test');
		expect(result).toEqual({ decrypted: decryptedPayload });
	});

	test('Should save database', async () => {
		global['__basedir'] = join(__dirname, 'config');

		const {
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		} = setup();

		const service = new DatabaseService(
			configService,
			windowService,
			iconService,
			webApiService,
			nativeApiService,
			encryptionEventService,
			fileService,
			dialogService,
		);

		const getWindowByWebContentsIdSpy = jest.spyOn(
			windowService,
			'getWindowByWebContentsId',
		);
		const setTitleSpy = jest.spyOn(windowService, 'setTitle');
		const sendMessageToAllSpy = jest.spyOn(windowService, 'sendMessageToAll');
		const encryptVaultDataSpy = jest
			.spyOn(encryptionEventService, 'encryptVaultData')
			.mockResolvedValue({ encrypted: 'encrypted' });
		const getVaultPasswordSpy = jest
			.spyOn(service, 'getVaultPassword')
			.mockReturnValue(null);
		jest.spyOn(service, 'getFilePath').mockReturnValue('C:\\path');
		const showSaveFileDialogSpy = jest.spyOn(
			dialogService,
			'showSaveFileDialog',
		);
		const writeSyncSpy = jest.spyOn(fileService, 'writeSync');
		const copySyncSpy = jest.spyOn(fileService, 'copySync');
		const unlinkSyncSpy = jest.spyOn(fileService, 'unlinkSync');

		const result = await service.saveDatabase(2, {
			config: { forceNew: false, notify: false },
			database: '<JSON>',
			password: 'test',
		});

		expect(getWindowByWebContentsIdSpy).toHaveBeenCalled();
		expect(getVaultPasswordSpy.mock.calls).toEqual([[2], [2]]);
		expect(showSaveFileDialogSpy).toHaveBeenCalled();
		expect(configService.appConfig.workspaces.recentlyOpened).toEqual(['']);
		expect(encryptVaultDataSpy).toHaveBeenCalledWith(
			undefined,
			'<JSON>',
			'test',
			'5fb71ba4f3bde831513ba0e780838f2f06dc818cc8a0049ce4ab79c71e54b553',
		);

		expect(writeSyncSpy).toHaveBeenCalled();
		expect(copySyncSpy).toHaveBeenCalled();
		expect(setTitleSpy).toHaveBeenCalled();
		expect(unlinkSyncSpy.mock.calls).toEqual([
			['.fbit~'],
			['tmpDir\\~407f6c8a.tmp'],
		]);
		expect(sendMessageToAllSpy.mock.calls).toEqual([
			[IpcChannel.GetRecentFiles, ['']],
			[IpcChannel.GetRecentFiles, ['']],
		]);

		expect(writeSyncSpy.mock.calls).toEqual([
			['workspacesPath', '{"workspace":"","recentlyOpened":[""]}', 'utf8'],
			['.fbit~', 'encrypted', 'base64'],
		]);

		expect(result).toMatchObject({ status: true, notify: false });
	});
});
