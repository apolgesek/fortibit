import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
	ConfigService,
	NotificationService,
	WorkspaceService,
} from '@app/core/services';
import { NumberInputComponent } from '@app/shared/components/config-controls/number-input/number-input.component';
import { TextInputComponent } from '@app/shared/components/config-controls/text-input/text-input.component';
import { ToggleInputComponent } from '@app/shared/components/config-controls/toggle-input/toggle-input.component';
import { SelectInputComponent } from '@app/shared/components/config-controls/select-input/select-input.component';
import { isControlInvalid } from '@app/utils';
import { WeekDayIndex } from '@config/product';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { asapScheduler, observeOn } from 'rxjs';

@Component({
	selector: 'app-general-tab',
	templateUrl: './general-tab.component.html',
	styleUrls: ['./general-tab.component.scss'],
	standalone: true,
	imports: [
		ReactiveFormsModule,
		FeatherModule,
		ToggleInputComponent,
		NumberInputComponent,
		TextInputComponent,
		SelectInputComponent,
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

	private readonly _passwordForm = this.formBuilder.group({
		autosaveEnabled: this.formBuilder.control(false),
		autoTypeEnabled: this.formBuilder.control(false),
		lockOnSystemLock: this.formBuilder.control(false),
		saveOnLock: this.formBuilder.control(false),
		showInsecureUrlPrompt: this.formBuilder.control(false),
		protectWindowsFromCapture: this.formBuilder.control(false),
		idleSeconds: this.formBuilder.control(
			0,
			Validators.compose([Validators.required, Validators.min(60)]),
		),
		clipboardClearSeconds: this.formBuilder.control(
			0,
			Validators.compose([Validators.required, Validators.min(0)]),
		),
		autocompleteShortcut: this.formBuilder.control(''),
		autocompletePasswordOnlyShortcut: this.formBuilder.control(''),
		autocompleteUsernameOnlyShortcut: this.formBuilder.control(''),
		scheduledReports: this.formBuilder.group({
			enabled: this.formBuilder.control(false),
			time: this.formBuilder.control({ value: '', disabled: true }),
			frequency: this.formBuilder.group({
				type: this.formBuilder.control<'daily' | 'weekly' | 'monthly'>({
					value: 'daily',
					disabled: true,
				}),
				oneIn: this.formBuilder.control<number>(
					{ value: null, disabled: true },
					[Validators.required, Validators.min(1), Validators.max(365)],
				),
				weekDayIndex: this.formBuilder.control<WeekDayIndex>(
					{ value: null, disabled: true },
					[Validators.required, Validators.min(1), Validators.max(6)],
				),
				dayOfMonth: this.formBuilder.control<number>(
					{ value: null, disabled: true },
					[Validators.required, Validators.min(1), Validators.max(31)],
				),
			}),
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
		this.configService.defaultConfigRestored$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => {
				this.passwordForm.patchValue(
					{
						autosaveEnabled: config.autosaveEnabled,
						autoTypeEnabled: config.autoTypeEnabled,
						lockOnSystemLock: config.lockOnSystemLock,
						saveOnLock: config.saveOnLock,
						showInsecureUrlPrompt: config.showInsecureUrlPrompt,
						protectWindowsFromCapture: config.protectWindowsFromCapture,
						idleSeconds: config.idleSeconds,
						clipboardClearSeconds: config.clipboardClearSeconds,
						autocompleteShortcut: config.autocompleteShortcut,
						autocompletePasswordOnlyShortcut:
							config.autocompletePasswordOnlyShortcut,
						autocompleteUsernameOnlyShortcut:
							config.autocompleteUsernameOnlyShortcut,
						scheduledReports: {
							enabled: config.scheduledReports.enabled,
							time: config.scheduledReports.time,
							frequency: {
								type: config.scheduledReports.frequency?.type,
								dayOfMonth: config.scheduledReports.frequency.dayOfMonth,
								weekDayIndex: config.scheduledReports.frequency.weekDayIndex,
								oneIn: config.scheduledReports.frequency.oneIn,
							},
						},
					},
					{ emitEvent: false },
				);

				this.toggleScheduledReportsFormGroupEnabled(
					config.scheduledReports.enabled,
					false,
				);

				this.updateScheduledReportFormGroupFromFrequency(
					config.scheduledReports.frequency.type,
					false,
				);
			});

		this.passwordForm.patchValue(this.configService.config);
		this.toggleScheduledReportsFormGroupEnabled(
			this.configService.config.scheduledReports.enabled,
		);
		this.updateScheduledReportFormGroupFromFrequency(
			this.configService.config.scheduledReports.frequency.type,
		);

		this.passwordForm.controls.scheduledReports.controls.enabled.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((enabled) => {
				const scheduledReports = this.passwordForm.controls.scheduledReports;
				scheduledReports.controls.time.setValue('21:00', { emitEvent: false });
				scheduledReports.controls.frequency.controls.type.setValue('daily', {
					emitEvent: false,
				});
				scheduledReports.controls.frequency.controls.oneIn.setValue(1, {
					emitEvent: false,
				});
				scheduledReports.controls.frequency.controls.weekDayIndex.setValue(0, {
					emitEvent: false,
				});
				scheduledReports.controls.frequency.controls.dayOfMonth.setValue(1, {
					emitEvent: false,
				});

				this.configService.setConfig({
					scheduledReports: {
						enabled: enabled,
						time: scheduledReports.controls.time.getRawValue(),
						frequency: scheduledReports.controls.frequency.getRawValue(),
					},
				});

				this.toggleScheduledReportsFormGroupEnabled(enabled);
			});

		this.passwordForm.controls.scheduledReports.controls.frequency.controls.type.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((type) => {
				this.updateScheduledReportFormGroupFromFrequency(type);
			});

		this.passwordForm.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (this.passwordForm.invalid) {
					return;
				}

				this.configService.setConfig(this.passwordForm.getRawValue());
			});

		this.passwordForm.controls.scheduledReports.valueChanges
			.pipe(observeOn(asapScheduler), takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => {
				if (value.enabled) {
					this.workspaceService.scheduleNext();
				}
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
			await this.configService.resetConfig();
			this.notificationService.add({
				type: 'success',
				alive: 10 * 1000,
				message: 'Default settings restored.',
			});
		}
	}

	private toggleScheduledReportsFormGroupEnabled(
		enabled: boolean,
		emitEvent = true,
	) {
		const scheduledReports = this.passwordForm.controls.scheduledReports;

		if (!enabled) {
			scheduledReports.controls.time.disable({ emitEvent });
			scheduledReports.controls.frequency.disable({ emitEvent });
		} else {
			scheduledReports.controls.time.enable({ emitEvent });
			scheduledReports.controls.frequency.enable({ emitEvent });
			scheduledReports.controls.frequency.controls.type.enable({ emitEvent });
		}
	}

	private updateScheduledReportFormGroupFromFrequency(
		frequency: 'daily' | 'weekly' | 'monthly',
		emitEvent = true,
	) {
		const scheduledReports = this.passwordForm.controls.scheduledReports;
		scheduledReports.controls.frequency.controls.oneIn.disable({ emitEvent });
		scheduledReports.controls.frequency.controls.weekDayIndex.disable({
			emitEvent,
		});
		scheduledReports.controls.frequency.controls.dayOfMonth.disable({
			emitEvent,
		});

		if (scheduledReports.controls.enabled.value === false) {
			return;
		}

		switch (frequency) {
			case 'daily':
				scheduledReports.controls.frequency.controls.oneIn.enable({
					emitEvent,
				});
				break;
			case 'weekly':
				scheduledReports.controls.frequency.controls.weekDayIndex.enable({
					emitEvent,
				});
				break;
			case 'monthly':
				scheduledReports.controls.frequency.controls.dayOfMonth.enable({
					emitEvent,
				});
				break;
			default:
				break;
		}
	}
}
