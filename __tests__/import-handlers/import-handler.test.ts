import { ConfigService } from '@root/main/services/config';
import { EncryptionEventWrapper } from '@root/main/services/encryption';
import type { IEncryptionEventWrapper } from '@root/main/services/encryption/encryption-event-wrapper.model';
import { IImportHandler } from '@root/main/services/import';
import { BitwardenHandler } from '@root/main/services/import/handlers/bitwarden-handler';
import { ChromeHandler } from '@root/main/services/import/handlers/chrome-handler';
import { FirefoxHandler } from '@root/main/services/import/handlers/firefox-handler';
import { KeePassHandler } from '@root/main/services/import/handlers/keepass-handler';
import { LastpassHandler } from '@root/main/services/import/handlers/lastpass-handler';
import { OnePasswordHandler } from '@root/main/services/import/handlers/onepassword-handler';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { normalize } from 'path';
import { mockIpcHandlers } from '../mocks/ipc-handlers';
import { mockServices } from '../mocks/services';

mockServices();
mockIpcHandlers();

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

const cases: [
	name: string,
	path: string,
	handler: new (
		encryptionEventWrapper: IEncryptionEventWrapper,
	) => IImportHandler,
	props: (keyof PasswordEntry)[],
][] = [
	[
		'OnePassword',
		'onepassword-valid.csv',
		OnePasswordHandler,
		['title', 'username', 'password', 'url', 'notes', 'otpAuth'],
	],
	[
		'Bitwarden',
		'bitwarden-valid.csv',
		BitwardenHandler,
		['title', 'username', 'password', 'url', 'notes', 'otpAuth'],
	],
	[
		'LastPass',
		'lastpass-valid.csv',
		LastpassHandler,
		['title', 'username', 'password', 'url', 'notes', 'otpAuth'],
	],
	[
		'Chrome',
		'chrome-valid.csv',
		ChromeHandler,
		['title', 'username', 'password', 'url', 'notes'],
	],
	[
		'Firefox',
		'firefox-valid.csv',
		FirefoxHandler,
		['username', 'password', 'url'],
	],
	[
		'KeePass',
		'keepass-valid.xml',
		KeePassHandler,
		['title', 'username', 'password', 'url', 'notes'],
	],
];

describe('Import service - get metadata', () => {
	test.each(cases)(
		'Valid %p file metadata should be fetched successfully',
		async (_, path, handler) => {
			const metadata = await new handler(
				new EncryptionEventWrapper(new ConfigService()),
			).getMetadata({
				filePaths: [normalize(__dirname + `/files/${path}`)],
				canceled: false,
			});

			expect(metadata.size).toBe(20);
		},
	);

	test.each(cases)(
		'Invalid %p file metadata should fail processing',
		async (_, __, handler) => {
			const instance = new handler(
				new EncryptionEventWrapper(new ConfigService()),
			);

			const action = () =>
				instance.getMetadata({
					filePaths: [
						normalize(__dirname + `/files/invalid.${instance.fileExtension}`),
					],
					canceled: false,
				});

			await expect(action()).rejects.toMatch('error');
		},
	);
});

describe('Import service - import', () => {
	test.each(cases)(
		'Valid %p file should be imported successfully',
		async (_, path, handler, props) => {
			const result = await new handler(
				new EncryptionEventWrapper(new ConfigService()),
			).import('test', normalize(__dirname + `/files/${path}`));

			const parsedResult = JSON.parse(result);
			expect(parsedResult.length).toBe(20);

			parsedResult.forEach((element) => {
				props.forEach((prop) => {
					expect(element).toHaveProperty(prop);
				});
			});
		},
	);
});
