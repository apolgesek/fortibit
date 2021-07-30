import { BrowserWindow } from 'electron';

export interface IWindow {
  createWindow(isDevMode: boolean): BrowserWindow;
  loadWindow(windowRef: BrowserWindow): void;
}