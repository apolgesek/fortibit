import { createServiceDecorator } from '../../di/create-service-decorator';
import {
	MessageBoxSyncOptions,
	OpenDialogOptions,
	SaveDialogOptions,
} from 'electron';

export const IDialogService =
	createServiceDecorator<IDialogService>('dialogService');

type OpenFileDialogOptions = Pick<OpenDialogOptions, 'defaultPath' | 'filters'>;
type SaveFileDialogOptions = Pick<SaveDialogOptions, 'defaultPath' | 'filters'>;
type InfoMessageBoxOptions = Pick<MessageBoxSyncOptions, 'message' | 'detail'>;

export interface IDialogService {
	showInfoBox(options: InfoMessageBoxOptions): number;
	showOpenFileDialog(
		window: Electron.BaseWindow,
		options?: OpenFileDialogOptions,
	): Promise<Pick<Electron.OpenDialogReturnValue, 'filePaths' | 'canceled'>>;
	showSaveFileDialog(
		window: Electron.BaseWindow,
		options?: SaveFileDialogOptions,
	): Promise<Pick<Electron.SaveDialogReturnValue, 'filePath' | 'canceled'>>;
}
