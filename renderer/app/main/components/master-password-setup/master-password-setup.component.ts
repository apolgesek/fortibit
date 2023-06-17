import { CommonModule } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IMessageBroker } from '@app/core/models';
import { WorkspaceService } from '@app/core/services';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';

interface IGetSaveSatus {
  status: boolean;
  message: string;
  file: any;
}

@Component({
  selector: 'app-master-password-setup',
  templateUrl: './master-password-setup.component.html',
  styleUrls: ['./master-password-setup.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule
  ]
})
export class MasterPasswordSetupComponent implements OnInit, OnDestroy {
  public onGetSaveStatus: (_: any, getSaveStatus: IGetSaveSatus) => void;
  public readonly minPasswordLength = 6;
  public readonly isControlInvalid = isControlInvalid;

  public masterPasswordForm: FormGroup;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly zone: NgZone,
    private readonly fb: FormBuilder,
  ) {
    this.masterPasswordForm = this.fb.group({
      newPassword: [null, Validators.compose([Validators.required, Validators.minLength(this.minPasswordLength)])],
      newPasswordDuplicate: [null]
    }, { validators: valueMatchValidator('newPassword', 'newPasswordDuplicate') });

    this.onGetSaveStatus = (_, { status })  => {
      this.zone.run(() => {
        if (status) {
          this.workspaceService.unlock();
        }
      });
    };
  }

  async saveNewDatabase() {
    markAllAsDirty(this.masterPasswordForm);

    if (this.masterPasswordForm.invalid) {
      return;
    }

    await this.workspaceService.saveNewDatabase(this.masterPasswordForm.get('newPassword')?.value, {
      forceNew: true
    });
  }

  ngOnInit(): void {
    this.messageBroker.ipcRenderer.on(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }

  ngOnDestroy(): void {
    this.messageBroker.ipcRenderer.off(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }
}
