import { CommonModule } from '@angular/common';
import {
	Component,
	inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GroupManager, WorkspaceService } from '@app/core/services';
import { ShowPasswordIconComponent } from '@app/shared/components/show-password-icon/show-password-icon.component';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';

@Component({
	selector: 'app-master-password-setup',
	templateUrl: './master-password-setup.component.html',
	styleUrls: ['./master-password-setup.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FeatherModule,
		ShowPasswordIconComponent,
		RouterLink
	],
})
export class MasterPasswordSetupComponent {
	public readonly minPasswordLength = 6;
	public readonly isControlInvalid = isControlInvalid;

	private readonly fb = inject(FormBuilder);
	private readonly messageBroker = inject(MessageBroker);
	private readonly groupManager = inject(GroupManager);
	private readonly _masterPasswordForm = this.fb.group(
		{
			newPassword: [
				'',
				Validators.compose([
					Validators.required,
					Validators.minLength(this.minPasswordLength),
				]),
			],
			newPasswordDuplicate: [''],
		},
		{ validators: valueMatchValidator('newPassword', 'newPasswordDuplicate') },
	);

	public get masterPasswordForm() {
		return this._masterPasswordForm;
	}

	constructor(private readonly workspaceService: WorkspaceService) {}

	async saveNewDatabase() {
		markAllAsDirty(this.masterPasswordForm);

		if (this.masterPasswordForm.invalid) {
			return;
		}

		// await this.messageBroker.ipcRenderer.invoke(IpcChannel.CreateNew);

		const result = await this.workspaceService.saveNewDatabase(
			this.masterPasswordForm.controls.newPassword?.value,
			{ forceNew: true },
		);

		await this.groupManager.setupGroups();

		if (result.status) {
			this.workspaceService.setDatabaseLoaded();
			this.workspaceService.unlock();
		}
	}
}
