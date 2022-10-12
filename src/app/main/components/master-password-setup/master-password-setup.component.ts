import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WorkspaceService } from '@app/core/services';
import { valueMatchValidator } from '@app/shared/validators';
import { isControlInvalid, markAllAsDirty } from '@app/utils';

@Component({
  selector: 'app-master-password-setup',
  templateUrl: './master-password-setup.component.html',
  styleUrls: ['./master-password-setup.component.scss']
})
export class MasterPasswordSetupComponent {
  public readonly minPasswordLength = 6;
  public readonly isControlInvalid = isControlInvalid;

  public masterPasswordForm: FormGroup;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly fb: FormBuilder,
  ) {
    this.masterPasswordForm = this.fb.group({
      newPassword: [null, Validators.compose([Validators.required, Validators.minLength(this.minPasswordLength)])],
      newPasswordDuplicate: [null]
    }, { validators: valueMatchValidator('newPassword', 'newPasswordDuplicate') });
   }

  async saveNewDatabase() {
    markAllAsDirty(this.masterPasswordForm);

    if (this.masterPasswordForm.invalid) {
      return;
    }

    const success = await this.workspaceService.saveNewDatabase(this.masterPasswordForm.get('newPassword')?.value, {
      forceNew: true
    });


    if (success) {
      this.masterPasswordForm.reset();
    }
  }
}
