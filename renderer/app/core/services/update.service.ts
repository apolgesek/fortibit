import { Inject, Injectable, NgZone } from '@angular/core';
import { UpdateState } from '@shared-renderer/index';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { MessageBroker } from 'injection-tokens';
import { IMessageBroker } from '../models';

@Injectable({ providedIn: 'root' })
export class UpdateService {
	private _progress: string;
	private _state: UpdateState;
	private _version: string;

	get progress(): string {
		return this._progress;
	}

	get state(): UpdateState {
		return this._state;
	}

	get version(): string {
		return this._version;
	}

	updateStateListener = (_: any, state: UpdateState, version: string) => {
		this.zone.run(() => {
			this._state = state;
			this._version = version;
		});
	};

	updateProgressListener = (_: any, progress: string) => {
		this.zone.run(() => {
			this._progress = progress;
		});
	};

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly zone: NgZone,
	) {}

	initialize() {
		this.messageBroker.ipcRenderer.on(
			IpcChannel.UpdateState,
			this.updateStateListener,
		);
		this.messageBroker.ipcRenderer.on(
			IpcChannel.UpdateProgress,
			this.updateProgressListener,
		);

		this.messageBroker.ipcRenderer.send(IpcChannel.GetUpdateState);
	}
}
