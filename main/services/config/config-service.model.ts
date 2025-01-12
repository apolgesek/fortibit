import { Configuration } from '../../../configuration';
import { createServiceDecorator } from '../../di';

export const IConfigService =
	createServiceDecorator<IConfigService>('configService');

export interface IConfigService {
	get productPath(): string;
	get workspacesPath(): string;
	get tmpDir(): string;
	get appConfig(): Configuration;
	set(settings: Partial<Configuration>);
}

export type ConfigServiceConstructor = new () => IConfigService;
