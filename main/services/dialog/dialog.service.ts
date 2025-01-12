import { dialog } from 'electron';
import { IConfigService } from '@root/main/services/config';
import { IDialogService } from './dialog-service.model';
import { getDefaultPath, getFileFilter } from '@root/main/util';

export class DialogService implements IDialogService {
	constructor(
		@IConfigService private readonly _configService: IConfigService,
	) {}

	showInfoBox(options: { message: string; detail?: string }): number {
		return dialog.showMessageBoxSync({
			type: 'info',
			title: this._configService.appConfig.name,
			message: options.message,
			detail: options.detail,
		});
	}

	showOpenFileDialog(
		window: Electron.BaseWindow,
		options?: {
			defaultPath?: string | undefined;
			filters?: Electron.FileFilter[] | undefined;
		},
	): Promise<{ filePaths: string[]; canceled: boolean }> {
		return dialog.showOpenDialog(window, {
			properties: ['openFile'],
			defaultPath:
				options?.defaultPath ??
				getDefaultPath(this._configService.appConfig, ''),
			filters: options?.filters ?? [
				getFileFilter(this._configService.appConfig, '$vault'),
			],
		});
	}

	showSaveFileDialog(
		window: Electron.BaseWindow,
		options?: {
			defaultPath?: string | undefined;
			filters?: Electron.FileFilter[] | undefined;
		},
	) {
		return dialog.showSaveDialog(window, {
			defaultPath:
				options?.defaultPath ??
				getDefaultPath(this._configService.appConfig, ''),
			filters: options?.filters ?? [
				getFileFilter(this._configService.appConfig, '$vault'),
			],
		});
	}
}
