import { Configuration } from '../../configuration';
import { FileFilter, app } from 'electron';
import { join } from 'path';
import { ProcessArgument } from '../process-argument.enum';
import { FileType } from '../types/file-type';

export function getFileFilter(
	config: Configuration,
	fileType: FileType,
): FileFilter {
	let fileFilter = {
		name: 'Fortibit database file',
		extensions: [config.fileExtension],
	};

	switch (fileType) {
		case 'csv':
			fileFilter = {
				name: 'Comma Separated Values File (.csv)',
				extensions: ['csv'],
			};
			break;
		case 'xml':
			fileFilter = {
				name: 'Extensible Markup Language File (.xml)',
				extensions: ['xml'],
			};
			break;
		default:
			break;
	}

	return fileFilter;
}

export function getDefaultPath(config: Configuration, path: string): string {
	const pathParts: string[] = [];

	if (app.commandLine.hasSwitch(ProcessArgument.E2E)) {
		pathParts.push(config.e2eFilesPath);
	}
	pathParts.push(path);

	return join(...pathParts);
}
