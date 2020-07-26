import { Component } from '@angular/core';
import { PasswordStoreService } from '@app/core/services';
import { fade } from '@app/shared/animations/fade-slide.animation';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';

@Component({
  selector: 'app-pop-ups',
  templateUrl: './pop-ups.component.html',
  styleUrls: ['./pop-ups.component.scss'],
  animations: [
    fade()
  ]
})
export class PopUpsComponent {
  public masterPasswordForm: FormGroup;
  public submitted: boolean;
  public readonly minPasswordLength = 6;

  get isRemoveEntryDialogShown(): boolean {
    return this.passwordStore.isRemoveEntryDialogShown;
  }

  set isRemoveEntryDialogShown(value: boolean) {
    this.passwordStore.isRemoveEntryDialogShown = value;
  }

  get isNewPasswordDialogShown(): boolean {
    return this.passwordStore.isNewPasswordDialogShown;
  }

  set isNewPasswordDialogShown(value: boolean) {
    this.passwordStore.isNewPasswordDialogShown = value;
  }

  get isConfirmExitDialogShown(): boolean {
    return this.passwordStore.isConfirmExitDialogShown;
  }

  set isConfirmExitDialogShown(value: boolean) {
    this.passwordStore.isConfirmExitDialogShown = value;
  }

  get isConfirmGroupRemoveDialogShown(): boolean {
    return this.passwordStore.isConfirmGroupRemoveDialogShown;
  }

  set isConfirmGroupRemoveDialogShown(value: boolean) {
    this.passwordStore.isConfirmGroupRemoveDialogShown = value;
  }

  get passwordsNotMatch(): boolean {
    return this.masterPasswordForm.get('newPassword').value !== this.masterPasswordForm.get('newPasswordDuplicate').value
      && this.submitted;
  }

  constructor(
    private passwordStore: PasswordStoreService,
    private fb: FormBuilder
  ) { 
    this.masterPasswordForm = this.fb.group({
      newPassword: ['', Validators.required],
      newPasswordDuplicate: ['', Validators.required]
    });
  }

  closeRemoveEntryDialog() {
    this.isRemoveEntryDialogShown = false;
  }

  closeConfirmExitDialog() {
    this.isConfirmExitDialogShown = false;
  }

  closeConfirmGroupRemoveDialog() {
    this.isConfirmGroupRemoveDialogShown = false;
  }

  removeGroup() {
    this.passwordStore.removeGroup();
    this.closeConfirmGroupRemoveDialog();
  }

  deleteEntry() {
    this.passwordStore.deleteEntry();
    this.closeRemoveEntryDialog();
  }

  exitApp() {
    this.passwordStore.exitApp();
  }

  saveNewDatabase() {
    this.submitted = true;
    Object.values(this.masterPasswordForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.passwordsNotMatch || this.masterPasswordForm.invalid) {
      return;
    }
    this.passwordStore.saveNewDatabase(this.masterPasswordForm.get('newPassword').value);
  }

  resetNewPasswordForm() {
    this.masterPasswordForm.reset();
    this.submitted = undefined;
  }

}
