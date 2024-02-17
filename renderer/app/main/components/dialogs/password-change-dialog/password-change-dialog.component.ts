import { CommonModule } from '@angular/common';
import { Component, ComponentRef, Inject, inject } from '@angular/core';
import {
	AbstractControl,
	FormBuilder,
	ReactiveFormsModule,
	ValidationErrors,
	ValidatorFn,
	Validators,
} from '@angular/forms';
import { IMessageBroker } from '@app/core/models';
import { ModalRef, ModalService, WorkspaceService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { ShowPasswordIconComponent } from '@app/shared/components/show-password-icon/show-password-icon.component';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { Observable, delay, from, map, tap } from 'rxjs';

@Component({
	selector: 'app-password-change-dialog',
	templateUrl: './password-change-dialog.component.html',
	styleUrls: ['./password-change-dialog.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		ModalComponent,
		ShowPasswordIconComponent,
	],
})
export class PasswordChangeDialogComponent implements IModal {
	public readonly isControlInvalid = isControlInvalid;

	ref: ComponentRef<unknown>;
	additionalData?: IAdditionalData;
	showBackdrop?: boolean;

	private readonly fb = inject(FormBuilder);
	private readonly _passwordForm = this.fb.group({
		currentPassword: [
			'',
			{
				validators: [Validators.required],
				asyncValidators: [this.passwordValidator()],
				updateOn: 'blur',
			},
		],
		newPassword: this.fb.group(
			{
				password: [
					'',
					{
						validators: Validators.compose([
							Validators.required,
							Validators.minLength(6),
						]),
					},
				],
				repeatPassword: [''],
			},
			{ validators: [valueMatchValidator('password', 'repeatPassword')] },
		),
	});

	get passwordForm() {
		return this._passwordForm;
	}

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly workspaceService: WorkspaceService,
		private readonly modalService: ModalService,
		private readonly modalRef: ModalRef,
	) {}

	get passwordsGroup() {
		return this.passwordForm.controls.newPassword;
	}

	close() {
		this.modalService.close(this.modalRef.ref);
	}

	async save() {
		markAllAsDirty(this.passwordForm);

		if (this.passwordForm.invalid) {
			return;
		}

		const result = await this.workspaceService.saveNewDatabase(
			this.passwordForm.value.newPassword.password,
			{ forceNew: false },
		);

		if (result.status) {
			this.passwordForm.controls.currentPassword.reset();
			this.passwordForm.controls.newPassword.reset();
		}
	}

	private passwordValidator(): ValidatorFn {
		return (control: AbstractControl): Observable<ValidationErrors | null> => {
			const password = control.value;

			return from(
				this.messageBroker.ipcRenderer.invoke(
					IpcChannel.ValidatePassword,
					password,
				),
			).pipe(
				tap(() => control.markAsPristine()),
				delay(300),
				tap(() => control.markAsDirty()),
				map((x) => (x ? null : { incorrectPassword: true })),
			);
		};
	}
}
