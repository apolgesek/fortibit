import { Inject, Injectable } from '@angular/core';
import { Configuration } from '@config/configuration';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { BehaviorSubject, Observable, forkJoin, from } from 'rxjs';
import { IMessageBroker } from '../models';

@Injectable({
	providedIn: 'root',
})
export class ConfigService {
	public readonly configLoadedSource$: Observable<Configuration>;
	private readonly configLoaded: BehaviorSubject<Configuration> = new BehaviorSubject(null);

	public get config(): Configuration {
		return this.configLoaded.value;
	}

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
	) {
		this.configLoadedSource$ = this.configLoaded.asObservable();
	}

	setConfig(config: Partial<Configuration>) {
		const fullConfig = { ...this.config, ...config };

		forkJoin([
			from(
				this.messageBroker.ipcRenderer.invoke(
					IpcChannel.ChangeEncryptionSettings,
					fullConfig,
				),
			),
			from(
				this.messageBroker.ipcRenderer.invoke(
					IpcChannel.ChangeScreenLockSettings,
					fullConfig,
				),
			),
			from(
				this.messageBroker.ipcRenderer.invoke(
					IpcChannel.ChangeWindowsCaptureProtection,
					fullConfig,
				),
			),
		]).subscribe(() => {
			this.messageBroker.ipcRenderer.send(IpcChannel.ConfigChanged, config);
			this.configLoaded.next(fullConfig);
		});
	}
}
