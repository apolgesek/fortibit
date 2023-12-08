import { IpcMainEvent } from 'electron';
import { createServiceDecorator } from '../../dependency-injection';
import { SaveFilePayload } from './save-file-payload';

export const IDatabaseService = createServiceDecorator<IDatabaseService>('databaseService');

export interface IDatabaseService {
  getPassword(windowId: number): string;
  setPassword(value: string, windowId: number);
  getFilePath(windowId: number): string;
  setDatabaseEntry(windowId: number, filePath: string);
  saveDatabase(event: IpcMainEvent, saveFilePayload: SaveFilePayload): void;
  openDatabase(event: IpcMainEvent, path: string): void;
  decryptDatabase(event: IpcMainEvent, password: string): Promise<void>;
  biometricsDecrypt(event: IpcMainEvent): Promise<void>;
  onAppExit(): void;
  clearRecoveryFiles(): void;
}