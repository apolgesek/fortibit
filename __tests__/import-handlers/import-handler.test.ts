import { ConfigService } from '@root/main/services/config';
import {
	EncryptionEventWrapper,
	IEncryptionEventWrapper,
} from '@root/main/services/encryption';
import { IImportHandler } from '@root/main/services/import';
import { BitwardenHandler } from '@root/main/services/import/handlers/bitwarden-handler';
import { LastpassHandler } from '@root/main/services/import/handlers/lastpass-handler';
import { OnePasswordHandler } from '@root/main/services/import/handlers/onepassword-handler';
import { normalize } from 'path';

jest.mock('@root/main/services/autotype', () => jest.fn());
jest.mock('@root/main/services/window', () => jest.fn());
jest.mock('@root/main/services/icon', () => jest.fn());
jest.mock('@root/main/services/web-api', () => jest.fn());
jest.mock('@root/main/services/database', () => jest.fn());
jest.mock('@root/main/services/clipboard', () => jest.fn());
jest.mock('@root/main/services/config', () => {
	return {
		ConfigService: jest.fn(),
	};
});
jest.mock('@root/main/services/encryption', () => {
	return {
		MessageEventType: { EncryptString: null },
		EncryptionEventWrapper: jest.fn().mockImplementation(() => {
			return {
				processEventAsync: () =>
					Promise.resolve({ encrypted: 'encryptedPassword' }),
			};
		}),
	};
});

describe('Import service - get metadata', () => {
	const cases: [
		name: string,
		path: string,
		handler: new (
			encryptionEventWrapper: IEncryptionEventWrapper,
		) => IImportHandler,
	][] = [
		['OnePassword', 'onepassword-valid.csv', OnePasswordHandler],
		['Bitwarden', 'bitwarden-valid.csv', BitwardenHandler],
		['LastPass', 'lastpass-valid.csv', LastpassHandler],
	];

	test.each(cases)(
		'Valid %p file metadata should be fetched successfully',
		async (name, path, handler) => {
			const metadata = await new handler(null).getMetadata({
				filePaths: [normalize(__dirname + `/files/${path}`)],
				canceled: false,
			});

			expect(metadata.size).toBe(20);
		},
	);

	test.each(cases)(
		'Invalid %p file metadata should fail processing',
		async (name, path, handler) => {
			const action = () =>
				new handler(null).getMetadata({
					filePaths: [normalize(__dirname + '/files/invalid.csv')],
					canceled: false,
				});

			await expect(action()).rejects.toMatch('error');
		},
	);
});

describe('Import service - import', () => {
	const cases: [
		name: string,
		path: string,
		handler: new (
			encryptionEventWrapper: IEncryptionEventWrapper,
		) => IImportHandler,
	][] = [
		['OnePassword', 'onepassword-valid.csv', OnePasswordHandler],
		['Bitwarden', 'bitwarden-valid.csv', BitwardenHandler],
		['LastPass', 'lastpass-valid.csv', LastpassHandler],
	];

	test.each(cases)(
		'Valid %p file should be imported successfully',
		async (name, path, handler) => {
			const result = await new handler(
				new EncryptionEventWrapper(new ConfigService()),
			).import('test', normalize(__dirname + `/files/${path}`));

			const parsedResult = JSON.parse(result);
			expect(parsedResult.length).toBe(20);

			parsedResult.forEach((element) => {
				expect(element).toHaveProperty('title');
				expect(element).toHaveProperty('username');
				expect(element).toHaveProperty('password');
				expect(element).toHaveProperty('url');
				expect(element).toHaveProperty('notes');
				expect(element).toHaveProperty('otpAuth');
			});
		},
	);
});
