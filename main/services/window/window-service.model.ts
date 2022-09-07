import { BrowserWindow } from 'electron';
import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';
import { IWindow } from './window-model';

export const IWindowService = createServiceDecorator<IWindowService>('windowService');

export interface IWindowService {
  windows: IWindow[];
  getWindowByWebContentsId(id: number): IWindow;
  createWindow(isDevMode: boolean): BrowserWindow;
  loadWindow(windowRef: BrowserWindow): Promise<void>;
  getWindow(index: number): BrowserWindow;
  removeWindow(windowRef: BrowserWindow): void;
  registerAutotypeHandler(activeWindowTitle: string): void;
  setIdleTimer(windowId: number): void;
  setTitle(windowId: number, title: string): void;
}