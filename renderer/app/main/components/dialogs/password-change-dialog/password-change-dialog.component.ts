import { CommonModule } from '@angular/common';
import { Component, ComponentRef, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IMessageBroker } from '@app/core/models';
import { ModalRef, ModalService, WorkspaceService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
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
    ModalComponent
  ],
})
export class PasswordChangeDialogComponent implements IModal, OnInit {
  public readonly isControlInvalid = isControlInvalid;
  public passwordForm!: FormGroup;

  ref: ComponentRef<unknown>;
  additionalData?: IAdditionalData;
  showBackdrop?: boolean;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly modalService: ModalService,
    private readonly modalRef: ModalRef,
    private readonly formBuilder: FormBuilder
  ) {}

  get passwordsGroup(): FormGroup {
    return this.passwordForm.get('newPassword') as FormGroup;
  }

  ngOnInit(): void {
    this.passwordForm = this.formBuilder.group({
      currentPassword: [null, {
        validators: [Validators.required],
        asyncValidators: [this.passwordValidator()], updateOn: 'blur'
      }],
      newPassword: this.formBuilder.group({
        password: [null, { validators: Validators.compose([Validators.required, Validators.minLength(6)]) }],
        repeatPassword: [null]
      }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
    });
  }

  close() {
    this.modalService.close(this.modalRef.ref);
  }

  async save() {
    markAllAsDirty(this.passwordForm);

    if (this.passwordForm.invalid) {
      return;
    }

    const success = await this.workspaceService
      .saveNewDatabase(this.passwordForm.value.newPassword.password, { forceNew: false });
    if (success) {
      this.passwordForm.get('currentPassword').reset();
      this.passwordForm.get('newPassword').reset();
    }
  }

  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const password = control.value;

      return from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ValidatePassword, password))
        .pipe(
          tap(() => control.markAsPristine()),
          delay(300),
          tap(() => control.markAsDirty()),
          map(x =>  x ? null : { incorrectPassword: true })
        );
    };
  }
}
