import { Configuration } from '../../../configuration';
import { createServiceDecorator } from '../../di';

export const IConfigService =
	createServiceDecorator<IConfigService>('configService');

export interface IConfigService {
	get productPath(): string;
	get workspacesPath(): string;
	get appConfig(): Configuration;
	set(settings: Partial<Configuration>);
}
