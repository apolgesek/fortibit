import { ImportHandler } from '../../../shared';
import { createServiceDecorator } from '../../di';
import { IImportHandler } from './import-handler.model';

export const IImportService =
	createServiceDecorator<IImportService>('importService');

export interface IImportService {
	setHandler(type: ImportHandler);
	getHandler(): IImportHandler;
}
