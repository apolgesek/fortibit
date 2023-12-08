import { CommonModule } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IMessageBroker } from '@app/core/models';
import { WorkspaceService } from '@app/core/services';
import { ShowPasswordIconComponent } from '@app/shared/components/show-password-icon/show-password-icon.component';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';

type SaveStatus = {
  status: boolean;
  message: string;
}

@Component({
  selector: 'app-master-password-setup',
  templateUrl: './master-password-setup.component.html',
  styleUrls: ['./master-password-setup.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    ShowPasswordIconComponent
  ]
})
export class MasterPasswordSetupComponent implements OnInit, OnDestroy {
  public onGetSaveStatus: (_: any, getSaveStatus: SaveStatus) => void;
  public readonly minPasswordLength = 6;
  public readonly isControlInvalid = isControlInvalid;

  private readonly fb = inject(FormBuilder);
  private readonly _masterPasswordForm = this.fb.group({
    newPassword: ['', Validators.compose([Validators.required, Validators.minLength(this.minPasswordLength)])],
    newPasswordDuplicate: ['']
  }, { validators: valueMatchValidator('newPassword', 'newPasswordDuplicate') });

  public get masterPasswordForm() {
    return this._masterPasswordForm;
  }

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly zone: NgZone,
  ) {
    this.onGetSaveStatus = (_, { status })  => {
      this.zone.run(() => {
        if (status) {
          this.workspaceService.setDatabaseLoaded();
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

    await this.workspaceService.saveNewDatabase(this.masterPasswordForm.controls.newPassword?.value, { forceNew: true });
  }

  ngOnInit(): void {
    this.messageBroker.ipcRenderer.on(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }

  ngOnDestroy(): void {
    this.messageBroker.ipcRenderer.off(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }
}
