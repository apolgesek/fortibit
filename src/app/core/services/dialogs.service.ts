import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  public isNewPasswordDialogShown = false;
  public isRemoveEntryDialogShown = false;
  public isConfirmExitDialogShown = false;
  public isConfirmGroupRemoveDialogShown = false;
  public isEntryDialogShown = false;

  constructor(
  ) { }

  openDeleteEntryWindow() {
    this.isRemoveEntryDialogShown = true;
  }

  openDeleteGroupWindow() {
    this.isConfirmGroupRemoveDialogShown = true;
  }

  openEntryWindow() {
    this.isEntryDialogShown = true;
  }

  openConfirmExitWindow() {
    this.isConfirmExitDialogShown = true;
  }

  openMasterPasswordWindow() {
    this.isNewPasswordDialogShown = true;
  }

  closeMasterPasswordWindow() {
    this.isNewPasswordDialogShown = false;
  }
}
