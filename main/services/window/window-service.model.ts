import { BrowserWindow } from 'electron';
import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';
import { IWindow } from './window-model';

export const IWindowService = createServiceDecorator<IWindowService>('windowService');

export interface IWindowService {
  windows: IWindow[];
  getWindowByWebContentsId(id: number): IWindow;
  createMainWindow(isDevMode: boolean): BrowserWindow;
  createEntrySelectWindow(): BrowserWindow;
  loadWindow(windowRef: BrowserWindow, path?: string): Promise<void>;
  getWindow(index: number): BrowserWindow;
  removeWindow(windowRef: BrowserWindow): void;
  setIdleTimer(): void;
  setTitle(windowId: number, title: string): void;
  getSecureKey(): string;
}