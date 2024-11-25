import { UpdateInformation } from '@root/main/types/update-information';
import { UpdateState } from '@shared-renderer/index';
import { createServiceDecorator } from '../../di/create-service-decorator';

export const IUpdateService =
	createServiceDecorator<IUpdateService>('updateService');

export interface IUpdateService {
	get updateState(): UpdateState;
	get updateInformation(): UpdateInformation;
	checkForUpdates(): Promise<boolean>;
	updateAndRelaunch(): void;
	isNewUpdateAvailable(): boolean;
	setUpdateState(state: UpdateState): void;
}
