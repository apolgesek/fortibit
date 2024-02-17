import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IMessageBroker } from '@app/core/models';
import {
	ConfigService,
	NotificationService,
	WorkspaceService,
} from '@app/core/services';
import { Product } from '@config/product';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';

@Component({
	selector: 'app-integration-tab',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, FeatherModule],
	templateUrl: './integration-tab.component.html',
	styleUrls: ['./integration-tab.component.scss'],
})
export class IntegrationTabComponent implements OnInit {
	public isBiometricsEnabledForCurrentDatabase = false;
	public credentialButtonDisabled = false;
	public isUnlocked = false;

	private readonly formBuilder = inject(FormBuilder);
	private readonly _integrationForm = this.formBuilder.group({
		biometricsAuthenticationEnabled: [false],
	});

	get integrationForm() {
		return this._integrationForm;
	}

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly workspaceService: WorkspaceService,
		private readonly destroyRef: DestroyRef,
		private readonly configService: ConfigService,
		private readonly notificationService: NotificationService,
	) {}

	get filePath(): string {
		return this.workspaceService.file?.filePath ?? '';
	}

	ngOnInit(): void {
		this._integrationForm.setValue({
			biometricsAuthenticationEnabled:
				this.configService.config.biometricsAuthenticationEnabled,
		});

		this.isUnlocked = !this.workspaceService.isLocked;
		this.isBiometricsEnabledForCurrentDatabase =
			this.isUnlocked &&
			this.configService.config.biometricsProtectedFiles.includes(
				this.filePath,
			);

		this.integrationForm.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((form) => {
				if (this.integrationForm.valid) {
					const configPartial = {
						biometricsAuthenticationEnabled:
							form.biometricsAuthenticationEnabled,
					} as Partial<Product>;

					this.configService.setConfig(configPartial);
				}
			});
	}

	async toggleBiometrics() {
		this.credentialButtonDisabled = true;
		this.isBiometricsEnabledForCurrentDatabase =
			!this.isBiometricsEnabledForCurrentDatabase;

		await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.ToggleBiometricsUnlock,
			this.isBiometricsEnabledForCurrentDatabase,
		);

		if (this.isBiometricsEnabledForCurrentDatabase) {
			this.configService.setConfig({
				biometricsProtectedFiles: [
					...this.configService.config.biometricsProtectedFiles,
					this.filePath,
				],
			});

			this.notificationService.add({
				type: 'success',
				message: 'Authentication credentials saved',
				alive: 5000,
			});
		} else {
			this.configService.setConfig({
				biometricsProtectedFiles:
					this.configService.config.biometricsProtectedFiles.filter(
						(x) => x !== this.filePath,
					),
			});

			this.notificationService.add({
				type: 'success',
				message: 'Authentication credentials removed',
				alive: 5000,
			});
		}

		this.credentialButtonDisabled = false;
	}
}
