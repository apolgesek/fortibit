import { ConfigService } from '@root/main/services/config';
import { EncryptionEventWrapper } from '@root/main/services/encryption';
import { ExportService } from '@root/main/services/export';
import { readFileSync } from 'fs';
import { normalize } from 'path';
import { mockIpcHandlers } from './mocks/ipc-handlers';
import { mockServices } from './mocks/services';

mockServices();
mockIpcHandlers();

jest.mock('@root/main/services/config', () => {
	return {
		ConfigService: jest.fn(),
	};
});
jest.mock('@root/main/services/encryption', () => {
	return {
		MessageEventType: { BulkDecryptString: null },
		IEncryptionEventWrapper: jest.fn(),
		EncryptionEventWrapper: jest.fn().mockImplementation(() => {
			return {
				processEventAsync: () =>
					Promise.resolve({
						decrypted: [
							{
								title: 'test',
								username: 'User',
								password: 'Password',
								url: 'https://test.com',
							},
							{
								title: 'Title',
								username: null,
								password: 'password',
							},
						],
					}),
			};
		}),
	};
});

describe('Export service', () => {
	test('Database should be exported successfully', async () => {
		const result = await new ExportService(
			new EncryptionEventWrapper(new ConfigService()),
		).export(
			'test',
			normalize(__dirname + '/output/exported.csv'),
			JSON.stringify({
				data: {
					data: [
						{
							tableName: 'entries',
							rows: [
								{
									title: 'test',
									username: 'User',
									password: 'encrypted',
									url: 'https://test.com',
								},
								{
									title: 'Title',
									username: null,
									password: 'encrypted',
								},
							],
						},
					],
				},
			}),
		);

		const fileContent = readFileSync(__dirname + '/output/exported.csv', {
			encoding: 'utf8',
		});

		expect(result).toBe(true);
		expect(fileContent).toBe(
			'"title","username","password","url","notes"\n"test","User","Password","https://test.com",\n"Title",,"password",,\n',
		);
	});
});
