import { BrowserWindow } from 'electron';
import { createServiceDecorator } from '../../di/create-service-decorator';
import { IWindow } from './window-model';

export const IWindowService =
	createServiceDecorator<IWindowService>('windowService');

export interface IWindowService {
	windows: IWindow[];
	get vaultWindows(): IWindow[];
	getWindowByWebContentsId(id: number): IWindow;
	createMainWindow(): BrowserWindow;
	createEntrySelectWindow(): BrowserWindow;
	loadWindow(windowRef: BrowserWindow, path?: string): Promise<void>;
	getWindow(index: number): BrowserWindow;
	removeWindow(windowRef: BrowserWindow): void;
	setIdleTimer(): void;
	setTitle(windowId: number, title: string): void;
	getSecureKey(): string;
	onLock(windowId: number): void;
}
