import { Product } from '@root/product';
import { IpcMainInvokeEvent } from 'electron';
import { createServiceDecorator } from '../../di';
import { SaveDatabaseResult } from '../../types/save-database-result';
import { SaveFilePayload } from './save-file-payload';

export const IDatabaseService =
	createServiceDecorator<IDatabaseService>('databaseService');

export interface IDatabaseService {
	get fileMap(): Map<number, { file: string; password?: Buffer }>;
	getPassword(windowId: number): string;
	setPassword(value: string, windowId: number);
	getFilePath(windowId: number): string;
	setDatabaseEntry(windowId: number, filePath: string);
	saveDatabase(event: IpcMainInvokeEvent, saveFilePayload: SaveFilePayload): Promise<SaveDatabaseResult>;
	openDatabase(event: IpcMainInvokeEvent, path: string): Promise<string>;
	decryptDatabase(event: IpcMainInvokeEvent, password: string): Promise<void>;
	biometricsDecrypt(event: IpcMainInvokeEvent): Promise<void>;
	onAppExit(): void;
	clearRecoveryFiles(): void;
	saveDatabaseSnapshot(event: IpcMainInvokeEvent, { database }): Promise<void>;
	getLeaks(event: IpcMainInvokeEvent, database: string): Promise<{ data: string | false; error: string }>;
	getWeakPasswords(event: IpcMainInvokeEvent, database: string): Promise<{ data: string | false; error: string }>;
	changeEncryptionSettings(settings: Partial<Product>): void;
	recoverFile(windowId: number): Promise<string>;
	checkRecoveryFile(windowId: number): string;
	removeRecoveryFile(windowId: number): void;
	removeBrowserSession(): Promise<void>;
}
