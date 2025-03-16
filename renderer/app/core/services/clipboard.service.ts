import { Injectable, inject } from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';
import { Configuration } from '@config/configuration';
import { PasswordEntry, IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
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
	private readonly messageBroker = inject(MessageBroker);
	private readonly notificationService = inject(NotificationService);
	private readonly configService = inject(ConfigService);
	private readonly entryPropertyMessageMap: Partial<
		Record<keyof PasswordEntry, string>
	> = {
		username: 'Username copied',
		password: 'Password copied',
		otpAuth: 'TOTP copied',
	};

	private config: Configuration;

	constructor() {
		this.configService.configLoadedSource$.subscribe(
			(config) => (this.config = config),
		);
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

		if (value === null || value === undefined || value === '') {
			return;
		}

		this.copyText({
			value: value as string,
			description: this.entryPropertyMessageMap[property],
			clearTimeMs: this.config.clipboardClearSeconds * 1_000,
			showCount: true,
		});
	}
}
