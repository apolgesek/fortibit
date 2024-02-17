import { readFileSync, writeFileSync } from 'fs';
import { EncryptionService } from '../main/services/encryption/encryption.service';
import { resolve } from 'path';

const ENCRYPTED_FILE_PATH = '__tests__/output/encrypted.fbit';

describe('Encryption service', () => {
	test('Should encrypt string', () => {
		const service = new EncryptionService();
		const password = 'password';
		const encryptedText = service.encryptString('password', password);
		writeFileSync(resolve(ENCRYPTED_FILE_PATH), encryptedText, {
			encoding: 'base64',
		});

		expect(encryptedText).not.toBeNull();
		expect(encryptedText.length).toBeGreaterThanOrEqual(password.length);
	});

	test('Should decrypt string', () => {
		const service = new EncryptionService();
		const password = 'password';
		const content = 'content 123';

		const encryptedText = service.encryptString(content, password);
		writeFileSync(resolve(ENCRYPTED_FILE_PATH), encryptedText, {
			encoding: 'base64',
		});
		const encrypted = readFileSync(ENCRYPTED_FILE_PATH, { encoding: 'base64' });
		const decryptedText = service.decryptString(encrypted, password);

		expect(decryptedText).toEqual(content);
	});
});
