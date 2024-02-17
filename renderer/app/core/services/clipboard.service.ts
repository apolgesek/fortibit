import { Inject, Injectable } from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';
import { Configuration } from '@config/configuration';
import { PasswordEntry, IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { IMessageBroker } from '../models';
import { ConfigService } from './config.service';

type CopyText = {
	value: string;
	description: string;
	clearTimeMs: number;
	showCount: boolean;
};

@Injectable({
	providedIn: 'root',
})
export class ClipboardService {
	private config: Configuration;
	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly notificationService: NotificationService,
		private readonly configService: ConfigService,
	) {
		this.configService.configLoadedSource$.subscribe((config) => {
			this.config = config;
		});
	}

	async copyText(model: CopyText) {
		const isCopied = this.messageBroker.ipcRenderer.invoke(
			IpcChannel.CopyCliboard,
			model.value,
		);

		if (isCopied) {
			this.notificationService.add({
				message: model.description,
				alive: model.clearTimeMs,
				type: 'success',
				showCount: model.showCount,
			});
		}
	}

	async copyEntryDetails(entry: PasswordEntry, property: keyof PasswordEntry) {
		let value = entry[property];
		if (property === 'password') {
			value = await this.messageBroker.ipcRenderer.invoke(
				IpcChannel.DecryptPassword,
				entry[property],
			);
		}

		this.copyText({
			value: value as string,
			description:
				property.substring(0, 1).toUpperCase() +
				property.substring(1) +
				' copied',
			clearTimeMs: this.config.clipboardClearTimeMs,
			showCount: true,
		});
	}
}
