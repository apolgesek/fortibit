import { ChangeDetectionStrategy, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoreService } from '@app/core/services/core.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng-lts/dynamicdialog';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterPasswordDialogComponent implements OnInit, OnDestroy {
  public readonly minPasswordLength = 6;

  public masterPasswordForm: FormGroup;
  public handler: (_, { status, message, file }) => void;

  get passwordsNotMatch(): boolean {
    return this.masterPasswordForm.get('newPassword').value 
      !== this.masterPasswordForm.get('newPasswordDuplicate').value;
  }

  constructor(
    private zone: NgZone,
    private fb: FormBuilder,
    private storageService: StorageService,
    private electronService: ElectronService,
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig,
    private coreService: CoreService
  ) { }

  ngOnInit(): void {
    this.masterPasswordForm = this.fb.group({
      newPassword: ['', Validators.required],
      newPasswordDuplicate: ['', Validators.required]
    });

    this.handler = (_, { status})  => {
      this.zone.run(() => {
        if (status) {
          this.ref.destroy();
          if (this.config.data) {
            this.coreService.execute(this.config.data.event, this.config.data.payload);
          }
        }
      });
    };

    this.electronService.ipcRenderer.on('saveStatus', this.handler);
  }

  ngOnDestroy(): void {
    this.resetNewPasswordForm();
  }

  saveNewDatabase() {
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
  }

  close() {
    this.ref.close();
  }
}
