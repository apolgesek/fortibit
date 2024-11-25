import { ImportMetadata } from './handlers/import-metadata.model';
import { FileType } from '@root/main/types/file-type';

export interface IImportHandler {
	fileExtension: FileType;
	getMetadata(value: Electron.OpenDialogReturnValue): Promise<ImportMetadata>;
	import(key: string, path: string): Promise<string>;
}
