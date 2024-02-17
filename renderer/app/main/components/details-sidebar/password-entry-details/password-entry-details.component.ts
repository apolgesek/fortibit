import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IpcChannel, PasswordEntry } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { LinkPipe } from '@app/shared/pipes/link.pipe';
import {
	ClipboardService,
	ConfigService,
	ModalService,
} from '@app/core/services';
import { MessageBroker } from 'injection-tokens';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Configuration } from '@config/configuration';

@Component({
	selector: 'app-password-entry-details',
	standalone: true,
	imports: [CommonModule, FeatherModule, LinkPipe],
	templateUrl: './password-entry-details.component.html',
	styleUrls: ['./password-entry-details.component.scss'],
})
export class PasswordEntryDetailsComponent implements OnInit {
	@Input() public readonly entry: PasswordEntry;

	private readonly configService = inject(ConfigService);
	private readonly modalService = inject(ModalService);
	private readonly messageBroker = inject(MessageBroker);
	private readonly clipboardService = inject(ClipboardService);
	private readonly destroyRef = inject(DestroyRef);

	private config: Configuration;

	get isUnsecured(): boolean {
		return (
			this.entry.type === 'password' && !this.entry?.url?.startsWith('https://')
		);
	}

	ngOnInit(): void {
		this.configService.configLoadedSource$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => {
				this.config = config;
			});
	}

	async openUrl(url: string): Promise<boolean> {
		let result = true;
		if (this.isUnsecured && this.config.showInsecureUrlPrompt) {
			result = await this.modalService.openConfirmOpenUrlWindow();
		}

		if (result) {
			this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, url);
		}

		return result;
	}

	copyToClipboard(entry: PasswordEntry, property: keyof PasswordEntry) {
		this.clipboardService.copyEntryDetails(entry, property);
	}
}
