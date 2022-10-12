import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';
import { IWindow } from '../window/window-model';

export const IExportService = createServiceDecorator<IExportService>('exportService');

export interface IExportService {
  export(window: IWindow, serialized: string): Promise<boolean>;
}