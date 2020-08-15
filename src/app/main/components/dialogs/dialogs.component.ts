import { Component } from '@angular/core';
import { DatabaseService } from '@app/core/services';
import { fade } from '@app/shared/animations/fade-slide.animation';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DialogsService } from '@app/core/services/dialogs.service';

@Component({
  selector: 'app-dialogs',
  templateUrl: './dialogs.component.html',
  styleUrls: ['./dialogs.component.scss'],
  animations: [
    fade()
  ]
})
export class DialogsComponent {
  public readonly minPasswordLength = 6;
  public masterPasswordForm: FormGroup;
  public submitted: boolean;
  public newEntryForm: FormGroup;

  get isRemoveEntryDialogShown(): boolean {
    return this.dialogsService.isRemoveEntryDialogShown;
  }

  set isRemoveEntryDialogShown(value: boolean) {
    this.dialogsService.isRemoveEntryDialogShown = value;
  }

  get isNewPasswordDialogShown(): boolean {
    return this.dialogsService.isNewPasswordDialogShown;
  }

  set isNewPasswordDialogShown(value: boolean) {
    this.dialogsService.isNewPasswordDialogShown = value;
  }

  get isConfirmExitDialogShown(): boolean {
    return this.dialogsService.isConfirmExitDialogShown;
  }

  set isConfirmExitDialogShown(value: boolean) {
    this.dialogsService.isConfirmExitDialogShown = value;
  }

  get isConfirmGroupRemoveDialogShown(): boolean {
    return this.dialogsService.isConfirmGroupRemoveDialogShown;
  }

  set isConfirmGroupRemoveDialogShown(value: boolean) {
    this.dialogsService.isConfirmGroupRemoveDialogShown = value;
  }

  get isEntryDialogShown(): boolean {
    return this.dialogsService.isEntryDialogShown;
  }

  set isEntryDialogShown(value: boolean) {
    this.dialogsService.isEntryDialogShown = value;
  }

  get passwordsNotMatch(): boolean {
    return this.masterPasswordForm.get('newPassword').value !== this.masterPasswordForm.get('newPasswordDuplicate').value
      && this.submitted;
  }

  get isEntryEdited(): boolean {
    return !!this.databaseService.editedEntry;
  }

  get selectedRowsCount(): number {
    return this.databaseService.selectedPasswords.length;
  }

  constructor(
    private databaseService: DatabaseService,
    private dialogsService: DialogsService,
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
    this.databaseService.removeGroup();
    this.closeConfirmGroupRemoveDialog();
  }

  deleteEntry() {
    this.databaseService.deleteEntry();
    this.closeRemoveEntryDialog();
  }

  exitApp() {
    this.databaseService.exitApp();
  }

  saveNewDatabase() {
    this.submitted = true;
    Object.values(this.masterPasswordForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.passwordsNotMatch || this.masterPasswordForm.invalid) {
      return;
    }
    this.databaseService.saveNewDatabase(this.masterPasswordForm.get('newPassword').value);
  }

  resetNewPasswordForm() {
    this.masterPasswordForm.reset();
    this.submitted = undefined;
  }

  addNewEntry() {
    Object.values(this.newEntryForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.newEntryForm.valid) {
      if (this.databaseService.editedEntry?.creationDate) {
        this.databaseService.addEntry(this.newEntryForm.value);
      } else {
        this.databaseService.addEntry({...this.newEntryForm.value, creationDate: new Date()});
      }
      this.dialogsService.isEntryDialogShown = false;
    }
  }

  clearEntryForm() {
    this.databaseService.editedEntry = undefined;
    this.newEntryForm.reset();
  }

  initEntryForm() {
    this.newEntryForm = this.fb.group({
      id: [''],
      title: [''],
      username: ['', Validators.required],
      value: ['', Validators.required],
      url: [''],
      notes: ['']
    }, { updateOn: 'blur' });

    if (this.databaseService.editedEntry) {
      this.newEntryForm.patchValue(this.databaseService.editedEntry);
    }
  }
}
