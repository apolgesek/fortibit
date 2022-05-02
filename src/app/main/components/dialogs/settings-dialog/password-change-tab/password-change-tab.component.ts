import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ElectronService, ModalService, StorageService } from '@app/core/services';
import { valueMatchValidator } from '@app/shared/validators';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { delay, from, map, Observable, tap } from 'rxjs';

@Component({
  selector: 'app-password-change-tab',
  templateUrl: './password-change-tab.component.html',
  styleUrls: ['./password-change-tab.component.scss']
})
export class PasswordChangeTabComponent {
  public readonly isControlInvalid = isControlInvalid;
  public passwordForm!: FormGroup;

  get passwordsGroup(): FormGroup {
    return this.passwordForm.get('newPasswords') as FormGroup;
  }

  get passwordFormEnabled(): boolean {
    if (!this.storageService.file) {
      if (this.passwordForm.enabled) {
        this.passwordForm.disable();
      }

      return false;
    } else {
      if (this.passwordForm.disabled) {
        this.passwordForm.enable();
      }

      return true;
    }
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly storageService: StorageService,
    private readonly electronService: ElectronService,
    private readonly modalService: ModalService
  ) {
    this.passwordForm = this.formBuilder.group({
      currentPassword: [null, { validators: [Validators.required], asyncValidators: [this.passwordValidator()], updateOn: 'blur' }],
      newPasswords: this.formBuilder.group({
        password: [null, { validators: Validators.compose([Validators.required, Validators.minLength(6)]) }],
        repeatPassword: [null]
      }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
    });
  }

  async savePassword() {
    markAllAsDirty(this.passwordForm);

    if (this.passwordForm.invalid) {
      return;
    }

    const success = await this.storageService.saveNewDatabase(this.passwordForm.value.newPasswords.password, { forceNew: false });
    if (success) {
      this.passwordForm.reset();
    }
  }

  saveFile() {
    this.modalService.openMasterPasswordWindow();
  }

  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const password = control.value;

      return from(this.electronService.ipcRenderer.invoke(IpcChannel.ValidatePassword, password))
        .pipe(
          tap(() => control.markAsPristine()),
          delay(300),
          tap(() => control.markAsDirty()),
          map(x =>  {
            return x ? null : { incorrectPassword: true }
          })
        );
    };
  }
}
