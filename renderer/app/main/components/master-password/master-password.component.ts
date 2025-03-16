import { CommonModule } from '@angular/common';
import {
	Component,
	DestroyRef,
	NgZone,
	OnDestroy,
	OnInit,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GroupId } from '@app/core/enums';
import { Toast } from '@app/core/models';
import {
	EntryManager,
	GroupManager,
	ModalService,
	NotificationService,
	WorkspaceService,
} from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { ShowPasswordIconComponent } from '@app/shared/components/show-password-icon/show-password-icon.component';
import { SvgComponent } from '@app/shared/components/svg/svg.component';
import { AutofocusDirective } from '@app/shared/directives/autofocus.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { markAllAsDirty, UiUtil } from '@app/utils';
import { Configuration } from '@config/configuration';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

type ColorProfile = { primary: string; secondary: string };

const SKELETON_ENTRY_COLOR_PROFILES = [
	{
		primary: '#c7e3d0',
		secondary: '#376d48',
	},
	{
		primary: '#ff9bab',
		secondary: '#8f3d49',
	},
	{
		primary: '#eae48f',
		secondary: '#9e961d',
	},
];

@Component({
	selector: 'app-master-password',
	templateUrl: './master-password.component.html',
	styleUrls: ['./master-password.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FeatherModule,
		AutofocusDirective,
		TooltipDirective,
		ShowPasswordIconComponent,
		SvgComponent,
	],
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
	public readonly skeletonEntryColorProfiles: ColorProfile[] =
		SKELETON_ENTRY_COLOR_PROFILES;

	public config: Configuration;
	public passwordVisible = false;
	public isCapsLockOn = false;

	private readonly formBuilder = inject(FormBuilder);
	private readonly messageBroker = inject(MessageBroker);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly groupManager = inject(GroupManager);
	private readonly entryManager = inject(EntryManager);
	private readonly zone = inject(NgZone);
	private readonly route = inject(ActivatedRoute);
	private readonly configService = inject(ConfigService);
	private readonly modalService = inject(ModalService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly notifcationService = inject(NotificationService);

	private readonly defaultGroup = GroupId.AllItems;
	private readonly _loginForm = this.formBuilder.group({
		password: ['', Validators.required],
	});

	private onDecryptedContent: (
		_: unknown,
		{ decrypted }: { decrypted: string },
	) => void;
	private _filePath: string;

	get loginForm() {
		return this._loginForm;
	}

	get passwordControl() {
		return this.loginForm.controls.password;
	}

	get filePath(): string {
		const path = this.workspaceService.file?.filePath;

		if (path) {
			this._filePath = path;
		}

		return this._filePath ?? '';
	}

	get biometricsAuthenticationEnabled(): boolean {
		return (
			this.config.biometricsAuthenticationEnabled &&
			this.config.biometricsProtectedFiles.includes(this.filePath)
		);
	}

	get isBiometricsAuthenticationInProgress(): boolean {
		return this.workspaceService.isBiometricsAuthenticationInProgress;
	}

	constructor() {
		this.onDecryptedContent = (
			_,
			{ decrypted, error }: { decrypted: string; error: string },
		) => {
			this.zone.run(async () => {
				if (decrypted && !error) {
					this.workspaceService.setSynced();
					await this.workspaceService.loadVault(decrypted);
				} else {
					this.workspaceService.isBiometricsAuthenticationInProgress = false;
					UiUtil.unlockInterface();
					this.notifcationService.add({
						type: 'error',
						message: error,
						alive: 5000,
					});
					this.loginForm.controls.password.setErrors({ error: true });
				}
			});
		};
	}

	async ngOnInit() {
		this.configService.configLoadedSource$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => (this.config = config));
		this.messageBroker.ipcRenderer.on(
			IpcChannel.DecryptedContent,
			this.onDecryptedContent,
		);
		this.workspaceService.loadedDatabase$
			.pipe(
				switchMap(() => from(this.selectDefaultGroup())),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.workspaceService.unlock();
			});
	}

	async selectDefaultGroup() {
		await this.groupManager.selectGroup(this.defaultGroup);
		await this.entryManager.setByGroup(this.defaultGroup);
		this.entryManager.updateEntriesSource();
	}

	ngOnDestroy() {
		this.loginForm.reset();
		this.messageBroker.ipcRenderer.off(
			IpcChannel.DecryptedContent,
			this.onDecryptedContent,
		);
	}

	changeVisibility(isVisible: boolean, element: HTMLInputElement) {
		element.type = isVisible ? 'text' : 'password';
	}

	togglePasswordVisibility() {
		this.passwordVisible = !this.passwordVisible;
	}

	async createNew(): Promise<void> {
		this.workspaceService.createNew();
	}

	openFile() {
		this.workspaceService.openFile();
	}

	openSettingsWindow() {
		this.modalService.openSettingsWindow();
	}

	async biometricsUnlock() {
		UiUtil.lockInterface();
		this.workspaceService.isBiometricsAuthenticationInProgress = true;

		await this.messageBroker.ipcRenderer.invoke(IpcChannel.DecryptBiometrics);
	}

	async onLoginSubmit() {
		markAllAsDirty(this.loginForm);

		if (this.loginForm.controls.password.hasError('required')) {
			const notificationModel: Toast = {
				type: 'error',
				message: 'Password is required',
				alive: 5000,
			};

			if (this.notifcationService.isActive(notificationModel)) {
				return;
			}

			this.notifcationService.add(notificationModel);
			return;
		}

		UiUtil.lockInterface();
		await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.DecryptDatabase,
			this.loginForm.value.password,
		);
	}

	detectCapsLock(event: KeyboardEvent) {
		this.isCapsLockOn = event.getModifierState('CapsLock');
	}
}
