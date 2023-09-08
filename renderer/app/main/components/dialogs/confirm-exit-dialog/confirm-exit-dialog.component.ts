import { Component, ComponentRef, Inject } from '@angular/core';
import { IpcChannel } from '../../../../../../shared/index';
import { IMessageBroker } from '@app/core/models';
import { WorkspaceService, ModalRef } from '@app/core/services';

import { MessageBroker } from 'injection-tokens';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss'],
  standalone: true,
  imports: [
    ModalComponent
  ],
})
export class ConfirmExitDialogComponent implements IModal {
  public readonly ref!: ComponentRef<ConfirmExitDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly modalRef: ModalRef
  ) { }

  async saveChanges() {
    this.messageBroker.ipcRenderer.once(IpcChannel.GetSaveStatus, () => {
      setTimeout(() => {
        this.executeTask();
      }, 500);
    });

    await this.workspaceService.saveDatabase();
  }

  executeTask() {
    this.modalRef.onActionResult.next(true);
    this.modalRef.onActionResult.complete();
    
    this.modalRef.close();
  }

  close() {
    this.modalRef.onActionResult.next(false);
    this.modalRef.onActionResult.complete();

    this.modalRef.close();
  }
}
