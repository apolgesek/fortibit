/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, ComponentRef, Inject } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { ModalRef } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { TabComponent } from '@app/shared/components/tab/tab.component';
import { TabsetComponent } from '@app/shared/components/tabset/tabset.component';
import { MessageBroker } from 'injection-tokens';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { EncryptionTabComponent } from './encryption-tab/encryption-tab.component';
import { GeneralTabComponent } from './general-tab/general-tab.component';
import { IntegrationTabComponent } from './integration-tab/integration-tab.component';
import { ViewTabComponent } from './view-tab/view-tab.component';

enum Tab {
  Integration = 'Integration'
}

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
    GeneralTabComponent
  ]
})
export class SettingsDialogComponent implements IModal {
  public readonly ref!: ComponentRef<SettingsDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly tab = Tab;

  constructor(
    private readonly modalRef: ModalRef,
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker
  ) { }

  close() {
    this.modalRef.close();
  }

  shouldIncludeTab(tab: Tab): boolean {
    switch (this.messageBroker.platform) {
      case 'darwin':
        if (tab === Tab.Integration) {
          return false;
        }
      default:
        return true;
    }
  }
}
