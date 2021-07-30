import { ChangeDetectionStrategy, Component, ComponentRef, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalService } from '@app/core/services/modal.service';
import { CoreService } from '@app/core/services/core.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { IpcChannel } from '@shared-models/*';
import { IAdditionalData, IModal } from '@app/shared';
import { EventType } from '@app/core/enums';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterPasswordDialogComponent implements OnInit, OnDestroy, IModal {
  public readonly minPasswordLength = 6;

  public masterPasswordForm: FormGroup;
  public handler: (_: Electron.IpcRendererEvent, { status, message, file }: {status: boolean, message: string, file: unknown}) => void;
  
  public readonly ref!: ComponentRef<MasterPasswordDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  
  get passwordsNotMatch(): boolean {
    return this.masterPasswordForm.get('newPassword')?.value 
      !== this.masterPasswordForm.get('newPasswordDuplicate')?.value;
  }

  constructor(
    private zone: NgZone,
    private fb: FormBuilder,
    private storageService: StorageService,
    private electronService: ElectronService,
    private coreService: CoreService,
    private modalService: ModalService
  ) { 
    this.masterPasswordForm = this.fb.group({
      newPassword: ['', Validators.required],
      newPasswordDuplicate: ['', Validators.required]
    });

    this.handler = (_, { status })  => {
      this.zone.run(() => {
        if (status) {
          if (typeof this.additionalData?.event !== 'undefined' && this.additionalData?.event !== null) {
            this.coreService.execute(this.additionalData.event as EventType, this.additionalData.payload);
          }
          
          this.close();
        }
      });
    };
  }

  ngOnInit(): void {
    this.electronService.ipcRenderer.on(IpcChannel.GetSaveStatus, this.handler);
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

    this.storageService.saveNewDatabase(this.masterPasswordForm.get('newPassword')?.value);
  }

  resetNewPasswordForm() {
    this.masterPasswordForm.reset();
  }

  close() {
    this.modalService.close(this.ref);
  }
}
