import { Component } from '@angular/core';
import { PasswordStoreService } from '@app/core/services';

@Component({
  selector: 'app-pop-ups',
  templateUrl: './pop-ups.component.html',
  styleUrls: ['./pop-ups.component.scss']
})
export class PopUpsComponent {

  public newPassword: string = '';
  public newPasswordRepeat: string = '';

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

  constructor(
    private passwordStore: PasswordStoreService
  ) { }

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
    this.passwordStore.saveNewDatabase(this.newPassword);
  }

  trySaveDatabase() {
    this.passwordStore.trySaveDatabase();
  }

}
