import { Component, ComponentRef, inject, Input } from '@angular/core';
import {
	AbstractControl,
	FormBuilder,
	ReactiveFormsModule,
	ValidationErrors,
	ValidatorFn,
	Validators,
} from '@angular/forms';
import { ModalRef, ModalService, WorkspaceService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { ShowPasswordIconComponent } from '@app/shared/components/show-password-icon/show-password-icon.component';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { Observable, from, map, switchMap, tap, timer } from 'rxjs';
import { ValidationErrorComponent } from '../../../../shared/components/validation-error/validation-error.component';

@Component({
	selector: 'app-password-change-dialog',
	templateUrl: './password-change-dialog.component.html',
	styleUrls: ['./password-change-dialog.component.scss'],
	standalone: true,
	imports: [
		ReactiveFormsModule,
		ModalComponent,
		ShowPasswordIconComponent,
		ValidationErrorComponent,
	],
})
export class PasswordChangeDialogComponent implements IModal {
	@Input() additionalData?: IAdditionalData;

	public readonly isControlInvalid = isControlInvalid;

	ref: ComponentRef<unknown>;
	showBackdrop?: boolean;

	private readonly fb = inject(FormBuilder);
	private readonly messageBroker = inject(MessageBroker);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly modalService = inject(ModalService);
	private readonly modalRef = inject(ModalRef);

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
			control.markAsPristine();

			return timer(300).pipe(
				switchMap(() => {
					return from(
						this.messageBroker.ipcRenderer.invoke(
							IpcChannel.ValidatePassword,
							password,
						),
					);
				}),
				tap(() => control.markAsDirty()),
				map((x) => (x ? null : { incorrectPassword: true })),
			);
		};
	}
}
