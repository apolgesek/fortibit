/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, ComponentRef } from '@angular/core';
import { ModalRef } from '@app/core/services';

import { IAdditionalData, IModal } from '@app/shared';
import { TabComponent } from '@app/shared/components/tab/tab.component';
import { TabsetComponent } from '@app/shared/components/tabset/tabset.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { EncryptionTabComponent } from './encryption-tab/encryption-tab.component';
import { IntegrationTabComponent } from './integration-tab/integration-tab.component';
import { PasswordChangeTabComponent } from './password-change-tab/password-change-tab.component';
import { ViewTabComponent } from './view-tab/view-tab.component';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TabsetComponent,
    TabComponent,

    ModalComponent,
    EncryptionTabComponent,
    ViewTabComponent,
    IntegrationTabComponent,
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
    this.modalRef.close();
  }
}
