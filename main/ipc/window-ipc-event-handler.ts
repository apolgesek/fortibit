import {
	dialog,
	ipcMain,
	IpcMainEvent,
	IpcMainInvokeEvent,
	MessageBoxOptions,
} from 'electron';
import { Configuration } from '../../configuration';
import { IpcChannel } from '../../shared';
import { createServiceDecorator } from '../di';
import { IWindowService } from '../services/window';
import { IIpcEventHandler } from './ipc-event-handler.model';
import { IConfigService } from '../services/config';
import { INativeApiService } from '../services/native';

const zoomLevels = [
	0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3,
];

export const IWindowIpcEventHandler =
	createServiceDecorator<WindowIpcEventHandler>('windowIpcEventHandler');

export class WindowIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IWindowService private readonly _windowService: IWindowService,
		@IConfigService private readonly _configService: IConfigService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {}

	initialize(): void {
		ipcMain.on(IpcChannel.TryClose, (ipcEvent: IpcMainEvent) => {
			const win = this._windowService.windows.find(
				(x) => x.browserWindow.webContents.id === ipcEvent.sender.id,
			);

			win?.browserWindow.focus();
		});

		ipcMain.on(IpcChannel.Exit, (event: IpcMainEvent) => {
			const win = this._windowService.windows.find(
				(x) => x.browserWindow.webContents.id === event.sender.id,
			);

			win?.browserWindow.close();
		});

		ipcMain.on(IpcChannel.Close, (event: IpcMainEvent) => {
			const win = this._windowService.getWindowByWebContentsId(event.sender.id);

			if (win.browserWindow.webContents.isDevToolsOpened()) {
				win.browserWindow.webContents.closeDevTools();
			}

			win.browserWindow.close();
		});

		ipcMain.on(IpcChannel.Unlock, (event: IpcMainEvent) => {
			this._windowService.onUnlock(event.sender.id);
		});

		ipcMain.handle(IpcChannel.ZoomIn, (event: IpcMainInvokeEvent) => {
			const currentFactor = parseFloat(event.sender.getZoomFactor().toFixed(2));
			if (currentFactor === zoomLevels[zoomLevels.length - 1])
				return zoomLevels[zoomLevels.length - 1];

			const idx = zoomLevels.findIndex((x) => x === currentFactor);
			event.sender.setZoomFactor(zoomLevels[idx + 1]);

			return zoomLevels[idx + 1];
		});

		ipcMain.handle(IpcChannel.ZoomOut, (event: IpcMainInvokeEvent) => {
			const currentFactor = parseFloat(event.sender.getZoomFactor().toFixed(2));
			if (currentFactor === zoomLevels[0]) return zoomLevels[0];

			const idx = zoomLevels.findIndex((x) => x === currentFactor);
			event.sender.setZoomFactor(zoomLevels[idx - 1]);

			return zoomLevels[idx - 1];
		});

		ipcMain.handle(IpcChannel.ResetZoom, (event: IpcMainInvokeEvent) => {
			event.sender.setZoomFactor(1);
			return 1;
		});

		ipcMain.handle(IpcChannel.ToggleFullscreen, (event: IpcMainInvokeEvent) => {
			const browserWindow = this._windowService.getWindowByWebContentsId(
				event.sender.id,
			).browserWindow;
			const fullscreenMode = !browserWindow.isFullScreen();
			browserWindow.setFullScreen(fullscreenMode);

			return fullscreenMode;
		});

		ipcMain.handle(
			IpcChannel.ChangeWindowsCaptureProtection,
			(event: IpcMainInvokeEvent, config: Partial<Configuration>) => {
				const win = this._windowService.windows.find(
					(x) => x.browserWindow.webContents.id === event.sender.id,
				);

				if (
					config.protectWindowsFromCapture !==
					this._configService.appConfig.protectWindowsFromCapture
				) {
					this._nativeApiService.setWindowAffinity(
						win!.browserWindow.getNativeWindowHandle(),
						config?.protectWindowsFromCapture ?? false,
					);
				}
			},
		);

		ipcMain.handle(IpcChannel.ToggleTheme, (_, config: Configuration) => {
			this._windowService.toggleTheme(config);
		});

		ipcMain.handle(IpcChannel.RegenerateKey, (event: IpcMainInvokeEvent) => {
			this._windowService.getWindowByWebContentsId(event.sender.id).key =
				this._windowService.getSecureKey();
		});

		ipcMain.handle(
			IpcChannel.OpenPrompt,
			async (event: IpcMainInvokeEvent, options: MessageBoxOptions) => {
				return await dialog.showMessageBox(
					this._windowService.getWindowByWebContentsId(event.sender.id)
						.browserWindow,
					options,
				);
			},
		);
	}
}
