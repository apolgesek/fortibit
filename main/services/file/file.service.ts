import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from 'fs';
import { IFileService } from './file-service.model';

export class FileService implements IFileService {
	readSync(path: string, encoding: 'utf8' | 'base64'): string {
		return readFileSync(path, { encoding });
	}

	writeSync(path: string, data: string, encoding: 'utf8' | 'base64'): void {
		writeFileSync(path, data, { encoding });
	}

	copySync(source: string, destination: string): void {
		copyFileSync(source, destination);
	}

	existsSync(path: string): boolean {
		return existsSync(path);
	}

	mkdirSync(path: string): void {
		mkdirSync(path);
	}

	renameSync(source: string, destination: string) {
		renameSync(source, destination);
	}

	unlinkSync(path: string) {
		unlinkSync(path);
	}
}
