import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { fade } from '@app/shared/animations/fade-slide.animation';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
  animations: [
    fade()
  ]
})
export class MasterPasswordDialogComponent implements OnInit, OnDestroy {

  public readonly minPasswordLength = 6;
  public masterPasswordForm: FormGroup;
  public submitted: boolean;

  get passwordsNotMatch(): boolean {
    return this.masterPasswordForm.get('newPassword').value 
      !== this.masterPasswordForm.get('newPasswordDuplicate').value
      && this.submitted;
  }

  constructor(
    private zone: NgZone,
    private fb: FormBuilder,
    private storageService: StorageService,
    private electronService: ElectronService,
    private messageService: MessageService,
    private ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
    this.masterPasswordForm = this.fb.group({
      newPassword: ['', Validators.required],
      newPasswordDuplicate: ['', Validators.required]
    });

    this.electronService.ipcRenderer.on('saveStatus', (_, { status, message, file }) => {
      this.zone.run(() => {
        if (status) {
          this.storageService.file = file;
          this.messageService.add({
            severity: 'success',
            summary: 'Database saved',
            life: 5000,
          });
          this.ref.close();
        } else if (message) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error: ' + message,
            life: 5000,
          });
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.resetNewPasswordForm();
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
