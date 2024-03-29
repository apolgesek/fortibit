import { IAppConfig } from '../../../app-config';
import { createServiceDecorator } from '../../dependency-injection';

export const IConfigService = createServiceDecorator<IConfigService>('configService');

export interface IConfigService {
  get appConfig(): IAppConfig;
  set(settings: Partial<IAppConfig>)
}