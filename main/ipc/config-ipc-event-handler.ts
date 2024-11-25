import { createServiceDecorator } from '../di';
import { IIpcEventHandler } from './ipc-event-handler.model';
import { INativeApiService } from '../services/native';
import { Configuration } from '@root/configuration';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { ipcMain, IpcMainEvent } from 'electron';
import { getDefaultConfig, IConfigService } from '../services/config';

export const IConfigIpcEventHandler =
	createServiceDecorator<ConfigIpcEventHandler>('configIpcEventHandler');

export class ConfigIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {}

	initialize(): void {
		ipcMain.handle(IpcChannel.GetAppConfig, async () => {
			const paths = await this._nativeApiService.listCredentials();
			this._configService.appConfig.biometricsProtectedFiles = paths;
			this._configService.appConfig.organizationName =
				this._nativeApiService.readRegistryKey('SOFTWARE\\Fortibit', 'org');

			return this._configService.appConfig;
		});

		ipcMain.handle(IpcChannel.GetDefaultConfig, async () => {
			return getDefaultConfig();
		});

		ipcMain.on(
			IpcChannel.ConfigChanged,
			(_: IpcMainEvent, config: Partial<Configuration>) => {
				this._configService.set(config);
			},
		);
	}
}
