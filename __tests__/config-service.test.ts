import { Configuration } from '@root/configuration';
import {
	ConfigService,
	EXCLUDED_CONFIG_KEYS,
} from '@root/main/services/config/config.service';
import { readFile, writeFileSync } from 'fs';
import { join } from 'path';

jest.mock('@root/main/services/config', () => {
	return {
		ConfigService: jest.fn(),
		IConfigService: jest.fn(),
		getDefaultConfig: jest.fn().mockImplementation(() => {
			return {
				autosaveEnabled: true,
				encryption: {
					lowercase: true,
					numbers: true,
					uppercase: true,
					specialChars: true,
					passwordLength: 15,
				},
				autoTypeEnabled: true,
				lockOnSystemLock: undefined,
			} as Partial<Configuration>;
		}),
	};
});
jest.mock('electron', () => {
	return {
		app: {
			getPath: jest.fn().mockReturnValue(__dirname),
			getName: jest.fn().mockReturnValue(''),
			getVersion: jest.fn().mockReturnValue('1.0.0'),
		},
	};
});

describe('Config service', () => {
	beforeAll(() => {
		// Arrange
		const productJsonContent = JSON.stringify({
			autosaveEnabled: false,
			encryption: {
				numbers: false,
				uppercase: false,
				specialChars: false,
				passwordLength: 12,
			},
			autoTypeEnabled: true,
			lockOnSystemLock: false,
		} as Configuration);

		writeFileSync(
			join(__dirname, 'config', 'product.json'),
			productJsonContent,
			{ encoding: 'utf-8' },
		);
	});

	test('Should load app config', () => {
		// Arrange
		global['__basedir'] = join(__dirname, 'config');
		const service = new ConfigService();

		// Assert
		expect(service.appConfig).toBeDefined();
		expect(service.appConfig.autosaveEnabled).toBe(false);
		expect(service.appConfig.autoTypeEnabled).toBe(true);
		expect(service.appConfig.lockOnSystemLock).toBe(false);
		expect(service.appConfig.encryption.lowercase).toBe(true);
		expect(service.appConfig.encryption.passwordLength).toBe(12);
		expect(service.appConfig.encryption.specialChars).toBe(false);
	});

	test('Should set app config', async () => {
		// Arrange
		global['__basedir'] = join(__dirname, 'config');
		const service = new ConfigService();

		// Act
		service.set({
			encryption: {
				passwordLength: 9,
				lowercase: true,
				uppercase: true,
				numbers: false,
				specialChars: false,
			},
			lockOnSystemLock: true,
		});

		// Assert
		expect(service.appConfig.encryption.passwordLength).toBe(9);
		expect(service.appConfig.encryption.lowercase).toBe(true);
		expect(service.appConfig.encryption.uppercase).toBe(true);
		expect(service.appConfig.encryption.numbers).toBe(false);
		expect(service.appConfig.encryption.specialChars).toBe(false);
		expect(service.appConfig.lockOnSystemLock).toBe(true);

		readFile(
			join(__dirname, 'config', 'product.json'),
			{
				encoding: 'utf-8',
			},
			(err, data) => {
				const savedConfig: Configuration = JSON.parse(data);

				EXCLUDED_CONFIG_KEYS.forEach((key) => {
					expect(savedConfig[key]).not.toBeDefined();
				});
			},
		);
	});
});
