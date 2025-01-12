import { createServiceDecorator } from '../../di';

export const IDownloadService =
	createServiceDecorator<IDownloadService>('downloadService');

export interface IDownloadService {
	download(
		url: string,
		path: string,
		errorCallback?: () => void,
		finishCallback?: () => void,
		downloadCallback?: (progress: string) => void,
	): Promise<string>;
}
