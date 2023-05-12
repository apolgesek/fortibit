import { ChangeDetectionStrategy, Component, ComponentRef, Inject } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { ICommunicationService } from '@app/core/models';
import { WorkspaceService, ModalRef } from '@app/core/services';

import { CommunicationService } from 'injection-tokens';
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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly workspaceService: WorkspaceService,
    private readonly modalRef: ModalRef
  ) { }

  async saveChanges() {
      this.communicationService.ipcRenderer.once(IpcChannel.GetSaveStatus, () => {
        setTimeout(() => {
          this.executeTask();
        }, 500);
      });

      await this.workspaceService.saveDatabase();
  }

  executeTask() {
    this.modalRef.onActionResult.next(true);
    this.modalRef.close();
  }

  close() {
    this.modalRef.onActionResult.next(false);
    this.modalRef.close();
  }
}
