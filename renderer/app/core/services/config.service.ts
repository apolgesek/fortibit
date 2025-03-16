import { Injectable, inject } from '@angular/core';
import { Configuration } from '@config/configuration';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { BehaviorSubject, Observable, Subject, forkJoin, from } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class ConfigService {
	public readonly configLoadedSource$: Observable<Configuration>;
	public readonly defaultConfigRestored$: Observable<Configuration>;

	public get config(): Configuration {
		return this.configLoaded.value;
	}

	private readonly messageBroker = inject(MessageBroker);
	private readonly configLoaded = new BehaviorSubject<Configuration>(null);
	private readonly defaultConfigRestored = new Subject<Configuration>();

	constructor() {
		this.configLoadedSource$ = this.configLoaded.asObservable();
		this.defaultConfigRestored$ = this.defaultConfigRestored.asObservable();
	}

	setConfig(config: Partial<Configuration>) {
		const fullConfig = { ...this.config, ...config };
		this.configLoaded.next(fullConfig);

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
			from(
				this.messageBroker.ipcRenderer.invoke(
					IpcChannel.ToggleTheme,
					fullConfig,
				),
			),
			from(
				this.messageBroker.ipcRenderer.invoke(
					IpcChannel.ChangeScheduledReportsSettings,
					fullConfig,
				),
			),
		]).subscribe(() => {
			this.messageBroker.ipcRenderer.send(IpcChannel.ConfigChanged, fullConfig);
		});
	}

	async resetConfig() {
		const config = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.GetDefaultConfig,
		);
		this.setConfig(config);
		this.defaultConfigRestored.next(config);
	}
}
