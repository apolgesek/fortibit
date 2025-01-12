import { BrowserWindow } from 'electron';

export interface IWindow {
	browserWindow: BrowserWindow;
	key: string | null;
	autocompleteListener?: ((...args) => void) | null;
}
