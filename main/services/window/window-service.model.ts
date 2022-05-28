import { BrowserWindow } from 'electron';
import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IWindowService = createServiceDecorator<IWindowService>('windowService');

export interface IWindowService {
  windows: BrowserWindow[];
  createWindow(isDevMode: boolean): BrowserWindow;
  loadWindow(windowRef: BrowserWindow): Promise<void>;
  getWindow(index: number): BrowserWindow;
  getWindowByWebContentsId(id: number);
  removeWindow(windowRef: BrowserWindow): void;
  registerWindowsAutotypeHandler(activeWindowTitle: string): void;
  setIdleTimer(windowId: number): void;
}