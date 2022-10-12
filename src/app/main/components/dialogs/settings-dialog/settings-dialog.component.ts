/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentRef } from '@angular/core';
import { ModalRef } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { ModalComponent } from '@app/shared';
import { IAdditionalData, IModal } from '@app/shared/models/modal.model';
import { EncryptionTabComponent } from './encryption-tab/encryption-tab.component';
import { PasswordChangeTabComponent } from './password-change-tab/password-change-tab.component';
import { ViewTabComponent } from './view-tab/view-tab.component';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss'],
  standalone: true,
  imports: [
    AutofocusDirective,
    ModalComponent,
    EncryptionTabComponent,
    ViewTabComponent,
    PasswordChangeTabComponent
  ]
})
export class SettingsDialogComponent implements IModal {
  public readonly ref!: ComponentRef<SettingsDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly modalRef: ModalRef,
  ) { }

  close() {
    this.modalRef.close()
  }
}
