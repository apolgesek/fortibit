import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { ipcMain, IpcMainEvent } from 'electron';
import { createServiceDecorator } from '../di';
import { IIpcEventHandler } from './ipc-event-handler.model';
import { UpdateState } from '../../shared';
import { IUpdateService } from '../services/update';
import { IWindowService } from '../services/window';

export const IUpdateIpcEventHandler =
	createServiceDecorator<UpdateIpcEventHandler>('updateIpcEventHandler');

export class UpdateIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IUpdateService private readonly _updateService: IUpdateService,
		@IWindowService private readonly _windowService: IWindowService,
	) {}

	initialize(): void {
		ipcMain.on(IpcChannel.GetUpdateState, async (event: IpcMainEvent) => {
			if (!this._updateService.updateState) {
				return;
			}

			this._windowService.sendMessage(
				event.sender.id,
				IpcChannel.UpdateState,
				this._updateService.updateState,
				this._updateService.updateInformation?.version,
			);
		});

		ipcMain.on(IpcChannel.CheckUpdate, () => {
			this._updateService.checkForUpdates().catch(() => {
				this._updateService.setUpdateState(UpdateState.ConnectionFailed);
			});
		});

		ipcMain.once(IpcChannel.UpdateAndRelaunch, () => {
			this._updateService.updateAndRelaunch();
		});
	}
}
