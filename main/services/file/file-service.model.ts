import { createServiceDecorator } from '../../di';

export const IFileService = createServiceDecorator<IFileService>('fileService');

export interface IFileService {
	readSync(path: string, encoding: 'utf8' | 'base64'): string;
	writeSync(path: string, data: string, encoding: 'utf8' | 'base64'): void;
	copySync(source: string, destination: string): void;
	existsSync(path: string): boolean;
	mkdirSync(path: string): void;
	renameSync(source: string, destination: string): void;
	unlinkSync(path: string): void;
}
