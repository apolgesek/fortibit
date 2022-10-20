/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentRef } from '@angular/core';
import { ModalRef } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { EncryptionTabComponent } from './encryption-tab/encryption-tab.component';
import { PasswordChangeTabComponent } from './password-change-tab/password-change-tab.component';
import { ViewTabComponent } from './view-tab/view-tab.component';
import { IAdditionalData, IModal } from '@app/shared';
import { TabComponent } from '@app/shared/components/tab/tab.component';
import { TabsetComponent } from '@app/shared/components/tabset/tabset.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TabsetComponent,
    TabComponent,
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
