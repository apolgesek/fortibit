import { Product } from '@root/product';
import { createServiceDecorator } from '../../di';
import { SaveDatabaseResult } from '../../types/save-database-result';
import { SaveFilePayload } from './save-file-payload';

export const IDatabaseService =
	createServiceDecorator<IDatabaseService>('databaseService');
export type FileMap = Map<number, { file: string; password?: Buffer | null }>;

export interface IDatabaseService {
	get fileMap(): FileMap;

	getVaultPassword(windowId: number): string | null;
	setVaultPassword(windowId: number, value: string | null): void;
	getFilePath(windowId: number): string | undefined;
	setDatabaseEntry(windowId: number, filePath: string);
	saveDatabase(
		windowId: number,
		saveFilePayload: SaveFilePayload,
	): Promise<SaveDatabaseResult>;
	openDatabase(windowId: number, path: string): Promise<string | undefined>;
	decryptDatabase(
		windowId: number,
		password: string,
	): Promise<{ decrypted?: string; error?: string }>;
	decryptWithBiometrics(
		windowId: number,
	): Promise<{ decrypted?: string; error?: string } | undefined>;
	onAppExit(): void;
	saveDatabaseSnapshot(windowId: number, { database }): Promise<void>;
	getLeaks(
		windowId: number,
		database: string,
	): Promise<{ data: string | false; error: string }>;
	getWeakPasswords(
		windowId: number,
		database: string,
	): Promise<{ data: string | false; error: string }>;
	recoverFile(windowId: number): Promise<string>;
	checkRecoveryFileExists(windowId: number): string | undefined;
	removeRecoveryFile(windowId: number): void;
	changeEncryptionSettings(settings: Partial<Product>);
	removeBrowserSession(): Promise<void>;
}
