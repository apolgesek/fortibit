import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	DestroyRef,
	Input,
	OnChanges,
	OnInit,
	inject,
} from '@angular/core';
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
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { CommonModule } from '@angular/common';
import * as OTPAuth from 'otpauth';

@Component({
	selector: 'app-password-entry-details',
	templateUrl: './password-entry-details.component.html',
	styleUrls: ['./password-entry-details.component.scss'],
	standalone: true,
	imports: [FeatherModule, LinkPipe, TooltipDirective, CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordEntryDetailsComponent implements OnInit, OnChanges {
	@Input({ required: true }) public readonly entry: PasswordEntry;

	public otpCode = '';
	public secondsLeft = 0;

	private readonly configService = inject(ConfigService);
	private readonly modalService = inject(ModalService);
	private readonly messageBroker = inject(MessageBroker);
	private readonly clipboardService = inject(ClipboardService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly cdRef = inject(ChangeDetectorRef);

	private config: Configuration;
	private otp: OTPAuth.TOTP;
	private otpInterval: number;

	get isUnsecured(): boolean {
		return (
			this.entry.type === 'password' && !this.entry?.url?.startsWith('https://')
		);
	}

	get isSecureProtocolAvailable(): boolean {
		return Boolean(this.entry.isSecureProtocolAvailable);
	}

	get isTfaAvailable(): boolean {
		return Boolean(this.entry.isTfaAvailable);
	}

	ngOnInit(): void {
		this.configService.configLoadedSource$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => {
				this.config = config;
			});
	}

	ngOnChanges() {
		if (this.otpInterval) {
			clearInterval(this.otpInterval);
			this.otpInterval = null;
		}
		
		if (this.entry.otpAuth) {
			this.otp = new OTPAuth.TOTP({
				secret: this.entry.otpAuth,
				digits: 6,
				period: 30,
				algorithm: 'SHA1',
				issuer: this.entry.title
			});

			this.generateNewOtp();

			this.otpInterval = window.setInterval(() => {
				this.secondsLeft--;

				if (this.secondsLeft <= 0) {
					this.generateNewOtp();
				}

				this.cdRef.detectChanges();
			}, 1_000);
		} else {
			this.otp = null;
			this.otpCode = '';
		}
	}

	private generateNewOtp() {
		this.otpCode = this.otp.generate();
		this.secondsLeft =
			this.otp.period - (Math.floor(Date.now() / 1_000) % this.otp.period);
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

	copyAuthCode() {
		this.clipboardService.copyText({
			value: this.otpCode,
			clearTimeMs: 5_000,
			description: 'One time password copied',
			showCount: false,
		});
	}
}
