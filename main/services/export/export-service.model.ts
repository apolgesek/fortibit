import { createServiceDecorator } from '../../di/create-service-decorator';

export const IExportService =
	createServiceDecorator<IExportService>('exportService');

export interface IExportService {
	export(key: string, path: string, serialized: string): Promise<boolean>;
}
