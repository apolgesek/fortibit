import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
	ConfigService,
	NotificationService,
	WorkspaceService,
} from '@app/core/services';
import { MasterPasswordSetupComponent } from '@app/main/components/master-password-setup/master-password-setup.component';
import { HotkeyBinderDirective } from '@app/main/directives/hotkey-binder.directive';
import { isControlInvalid } from '@app/utils';
import { Configuration } from '@config/configuration';
import { getDefaultConfig } from '@shared-renderer/default-config';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
	selector: 'app-general-tab',
	templateUrl: './general-tab.component.html',
	styleUrls: ['./general-tab.component.scss'],
	standalone: true,
	imports: [
		ReactiveFormsModule,
		FeatherModule,
		MasterPasswordSetupComponent,
		HotkeyBinderDirective,
	],
})
export class GeneralTabComponent implements OnInit {
	public readonly isControlInvalid = isControlInvalid;

	private readonly formBuilder = inject(FormBuilder);
	private readonly messageBroker = inject(MessageBroker);
	private readonly destroyRef = inject(DestroyRef);
	private readonly notificationService = inject(NotificationService);
	private readonly configService = inject(ConfigService);
	private readonly workspaceService = inject(WorkspaceService);

	private readonly debounceTimeMs = 500;
	private readonly _passwordForm = this.formBuilder.group({
		toggle: this.formBuilder.group({
			autoSave: [false],
			autoType: [false],
			lockOnSystemLock: [false],
			saveOnLock: [false],
			showInsecureUrlPrompt: [false],
			protectWindowsFromCapture: [false],
		}),
		input: this.formBuilder.group({
			idleTime: [
				0,
				Validators.compose([Validators.required, Validators.min(60)]),
			],
			clipboardTime: [
				0,
				Validators.compose([Validators.required, Validators.min(0)]),
			],
			autotypeShortcut: [''],
			autotypePasswordOnlyShortcut: [''],
			autotypeUsernameOnlyShortcut: [''],
		}),
	});

	get passwordForm() {
		return this._passwordForm;
	}

	get isLocked(): boolean {
		return this.workspaceService.isLocked;
	}

	get isSaved(): boolean {
		return Boolean(this.workspaceService.file);
	}

	ngOnInit() {
		// unlike other settings tabs this one must listen to confif changes made by Restore button
		this.configService.configLoadedSource$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => {
				this.passwordForm.setValue(
					{
						toggle: {
							autoSave: config.autosaveEnabled,
							autoType: config.autoTypeEnabled,
							lockOnSystemLock: config.lockOnSystemLock,
							saveOnLock: config.saveOnLock,
							showInsecureUrlPrompt: config.showInsecureUrlPrompt,
							protectWindowsFromCapture: config.protectWindowsFromCapture,
						},
						input: {
							idleTime: config.idleSeconds,
							clipboardTime: config.clipboardClearTimeMs / 1000,
							autotypeShortcut: config.autocompleteShortcut,
							autotypePasswordOnlyShortcut:
								config.autocompletePasswordOnlyShortcut,
							autotypeUsernameOnlyShortcut:
								config.autocompleteUsernameOnlyShortcut,
						},
					},
					{ emitEvent: false },
				);
			});

		this.passwordForm.controls.toggle.valueChanges
			.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe((form) => {
				if (this.passwordForm.controls.toggle.invalid) {
					return;
				}

				const configPartial = {
					autosaveEnabled: form.autoSave,
					autoTypeEnabled: form.autoType,
					lockOnSystemLock: form.lockOnSystemLock,
					saveOnLock: form.saveOnLock,
					showInsecureUrlPrompt: form.showInsecureUrlPrompt,
					protectWindowsFromCapture: form.protectWindowsFromCapture,
				} as Partial<Configuration>;

				this.configService.setConfig(configPartial);
			});

		this.passwordForm.controls.input.valueChanges
			.pipe(
				debounceTime(this.debounceTimeMs),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((form) => {
				if (this.passwordForm.controls.input.invalid) {
					return;
				}

				const configPartial = {
					idleSeconds: form.idleTime,
					clipboardClearTimeMs: form.clipboardTime * 1000,
					autocompleteShortcut: form.autotypeShortcut,
					autocompletePasswordOnlyShortcut: form.autotypePasswordOnlyShortcut,
					autocompleteUsernameOnlyShortcut: form.autotypeUsernameOnlyShortcut,
				} as Partial<Configuration>;

				this.configService.setConfig(configPartial);
			});
	}

	async restoreDefaults() {
		const result = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.OpenPrompt,
			{
				title: this.configService.config.name,
				type: 'info',
				message: 'Are you sure you want to restore default settings?',
				detail: 'The default setup provides optimal level of security.',
				buttons: ['Restore', 'Cancel'],
				noLink: true,
			},
		);

		if (result.response === 0) {
			this.configService.setConfig(
				getDefaultConfig(this.messageBroker.platform),
			);
			this.notificationService.add({
				type: 'success',
				alive: 10 * 1000,
				message: 'Default settings restored.',
			});
		}
	}

	onNumberChange(event: Event, path: string, maxLength: number) {
		const input = event.target as HTMLInputElement;
		const value = input.value.toString();

		if (value.length >= maxLength) {
			input.valueAsNumber = parseInt(value.slice(0, maxLength), 10);
			this.passwordForm.get(path).setValue(input.value);
		}
	}
}
