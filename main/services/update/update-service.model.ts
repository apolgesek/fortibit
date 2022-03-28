import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IUpdateService = createServiceDecorator<IUpdateService>('updateService');

export interface IUpdateService {
  checkForUpdates(): Promise<boolean>;
  updateAndRelaunch(): void;
  isNewUpdateAvailable(): boolean;
}