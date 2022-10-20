import { ChangeDetectionStrategy, Component, ComponentRef, Inject } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { MasterPasswordDialogComponent } from '../master-password-dialog/master-password-dialog.component';
import { EventType } from '@app/core/enums';
import { ModalManager } from '@app/core/services/modal-manager';
import { ICommunicationService } from '@app/core/models';
import { WorkspaceService, ModalRef } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss'],
  standalone: true,
  imports: [
    AutofocusDirective,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmExitDialogComponent implements IModal {
  public readonly ref!: ComponentRef<ConfirmExitDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly modalManager: ModalManager,
    private readonly workspaceService: WorkspaceService,
    private readonly modalRef: ModalRef
  ) { }

  async saveChanges() {
    if (!this.workspaceService.file) {
      this.modalManager.open(MasterPasswordDialogComponent, { event: this.additionalData.event });
      this.close();

    } else {
      this.communicationService.ipcRenderer.once(IpcChannel.GetSaveStatus, () => {
        setTimeout(() => {
          this.executeTask();
        }, 500);
      });

      await this.workspaceService.saveDatabase();
    }
  }

  executeTask() {
    this.close();
    this.workspaceService.execute(this.additionalData.event as EventType, this.additionalData.payload);
  }

  close() {
    this.modalRef.close()
  }
}
