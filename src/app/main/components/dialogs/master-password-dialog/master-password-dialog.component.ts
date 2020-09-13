import { Component, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { fade } from '@app/shared/animations/fade-slide.animation';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
  animations: [
    fade()
  ]
})
export class MasterPasswordDialogComponent implements OnInit {

  public readonly minPasswordLength = 6;
  public masterPasswordForm: FormGroup;
  public submitted: boolean;

  get passwordsNotMatch(): boolean {
    return this.masterPasswordForm.get('newPassword').value !== this.masterPasswordForm.get('newPasswordDuplicate').value
      && this.submitted;
  }

  constructor(
    private storageService: StorageService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.masterPasswordForm = this.fb.group({
      newPassword: ['', Validators.required],
      newPasswordDuplicate: ['', Validators.required]
    });
  }

  saveNewDatabase() {
    this.submitted = true;
    Object.values(this.masterPasswordForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.passwordsNotMatch || this.masterPasswordForm.invalid) {
      return;
    }
    this.storageService.saveNewDatabase(this.masterPasswordForm.get('newPassword').value);
  }

  resetNewPasswordForm() {
    this.masterPasswordForm.reset();
    this.submitted = undefined;
  }
}
