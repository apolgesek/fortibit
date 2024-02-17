import { CommonModule } from '@angular/common';
import {
	ChangeDetectorRef,
	Component,
	DestroyRef,
	ElementRef,
	Input,
	OnInit,
	QueryList,
	ViewChildren,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	ControlContainer,
	FormGroup,
	ReactiveFormsModule,
} from '@angular/forms';
import {
	ClipboardService,
	ConfigService,
	EntryManager,
	NotificationService,
} from '@app/core/services';
import { EntryDialogDataPayload, IAdditionalData } from '@app/shared';
import { PasswordStrengthMeterComponent } from '@app/shared/components/password-strength-meter/password-strength-meter.component';
import { isControlInvalid } from '@app/utils';
import { Configuration } from '@config/configuration';
import { IpcChannel, PasswordEntry } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { filter, fromEvent, take } from 'rxjs';
import zxcvbn from 'zxcvbn';
import { EntryForm, PasswordFormGroup } from '../../entry-dialog.component';

@Component({
	selector: 'app-password-entry-partial-form',
	standalone: true,
	imports: [
		CommonModule,
		FeatherModule,
		ReactiveFormsModule,
		PasswordStrengthMeterComponent,
	],
	templateUrl: './password-entry-partial-form.component.html',
	styleUrls: ['./password-entry-partial-form.component.scss'],
})
export class PasswordEntryPartialFormComponent implements OnInit {
	@ViewChildren('passwordInput')
	public readonly passwordInputs: QueryList<ElementRef>;
	@Input() public readonly isReadOnly = false;
	@Input()
	public readonly additionalData!: IAdditionalData<EntryDialogDataPayload>;
	public readonly isControlInvalid = isControlInvalid;

	public passwordForm: FormGroup<PasswordFormGroup>;
	public isVisible = true;
	public passwordScore = -1;
	public passwordVisible = false;

	private readonly controlContainer = inject(ControlContainer);
	private readonly clipboardService = inject(ClipboardService);
	private readonly notificationService = inject(NotificationService);
	private readonly entryManager = inject(EntryManager);
	private readonly messageBroker = inject(MessageBroker);
	private readonly configService = inject(ConfigService);
	private readonly cdRef = inject(ChangeDetectorRef);
	private readonly destroyRef = inject(DestroyRef);

	private config: Configuration;

	ngOnInit(): void {		
		this.passwordForm = (
			this.controlContainer.control as EntryForm
		).controls.password;

		this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
			this.config = config;
			const passwordMask = new Array(
				this.additionalData?.payload.decryptedPassword?.length ??
					Math.ceil(this.config.encryption.passwordLength / 2),
			)
				.fill('*')
				.join('');

			this.passwordForm.controls.passwords.controls.password.patchValue(
				passwordMask,
			);
			this.passwordForm.controls.passwords.controls.repeatPassword.patchValue(
				passwordMask,
			);

			this.prefillForm();
		});
	}

	ngAfterViewInit(): void {
		this.passwordInputs.forEach((el) => {
			fromEvent(el.nativeElement, 'keydown')
				.pipe(
					filter((e: KeyboardEvent) => e.ctrlKey && e.key === 'z'),
					takeUntilDestroyed(this.destroyRef),
				)
				.subscribe((event: KeyboardEvent) => {
					event.preventDefault();
				});
		});
	}

	onPasswordChange(event: Event) {
		const password = (event.target as HTMLInputElement).value;
		this.passwordScore = zxcvbn(password).score;
	}

	copyPassword() {
		this.clipboardService.copyEntryDetails(
			this.entryManager.editedEntry as PasswordEntry,
			'password',
		);
	}

	togglePasswordVisibility() {
		this.passwordVisible = !this.passwordVisible;
	}

	async regeneratePassword(): Promise<void> {
		await this.fillNewEntry();
		this.passwordScore = zxcvbn(
			this.passwordForm.value.passwords.password,
		).score;
		this.notificationService.add({
			type: 'success',
			alive: 5000,
			message: 'Password regenerated',
		});
	}

	private async prefillForm() {
		if (this.entryManager.editedEntry) {
			this.fillExistingEntry();
		} else {
			await this.fillNewEntry();
		}

		const password = this.passwordForm.value.passwords.password;

		if (password) {
			this.passwordScore = zxcvbn(password).score;
		}

		this.cdRef.detectChanges();
	}

	private async fillNewEntry() {
		const password = await this.generatePassword();

		this.passwordForm.controls.passwords.patchValue({
			password,
			repeatPassword: password,
		});
	}

	private fillExistingEntry() {
		const password = this.additionalData.payload.decryptedPassword;
		const entry = this.entryManager.editedEntry as PasswordEntry;

		this.passwordForm.patchValue({
			username: entry.username,
			icon: entry.icon,
			autotypeExp: entry.autotypeExp,
			notes: entry.notes,
			url: entry.url,
			passwords: {
				password,
				repeatPassword: password,
			},
		});
	}

	private generatePassword(): Promise<string> {
		const settings = this.config.encryption;

		return this.messageBroker.ipcRenderer.invoke(IpcChannel.GeneratePassword, {
			length: settings.passwordLength,
			lowercase: settings.lowercase,
			uppercase: settings.uppercase,
			symbols: settings.specialChars,
			numbers: settings.numbers,
			strict: false,
			excludeSimilarCharacters: true,
		});
	}
}
