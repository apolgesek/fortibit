import { IpcMainEvent } from 'electron';
import { createServiceDecorator } from '../../dependency-injection';

export const IDatabaseService = createServiceDecorator<IDatabaseService>('databaseService');

export interface IDatabaseService {
  get dbPassword(): string;
  set dbPassword(value: string);
  getFilePath(windowId: number): string;
  setFilePath(windowId: number, filePath: string);
  saveDatabase(event: IpcMainEvent, database: JSON, newPassword: string, config: any): void;
  openDatabase(event: IpcMainEvent): void;
  decryptDatabase(event: IpcMainEvent, password: string): void;
}