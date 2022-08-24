import { ChangeDetectionStrategy, Component, ComponentRef, Inject } from '@angular/core';
import { StorageService } from '@app/core/services/managers/storage.service';
import { IpcChannel } from '@shared-renderer/index';
import { MasterPasswordDialogComponent } from '../master-password-dialog/master-password-dialog.component';
import { IAdditionalData, IModal } from '@app/shared';
import { EventType } from '@app/core/enums';
import { ModalManager } from '@app/core/services/modal-manager';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ModalRef } from '@app/core/services';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmExitDialogComponent implements IModal {
  public readonly ref!: ComponentRef<ConfirmExitDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly storageService: StorageService,
    private readonly modalManager: ModalManager,
    private readonly modalRef: ModalRef
  ) { }

  async saveChanges() {
    if (!this.storageService.file) {
      this.modalManager.open(MasterPasswordDialogComponent, { event: this.additionalData.event });
      this.close();

    } else {
      this.communicationService.ipcRenderer.once(IpcChannel.GetSaveStatus, () => {
        setTimeout(() => {
          this.executeTask();
        }, 500);
      });

      await this.storageService.saveDatabase();
    }
  }

  executeTask() {
    this.close();
    this.storageService.execute(this.additionalData.event as EventType, this.additionalData.payload);
  }

  close() {
    this.modalRef.close()
  }
}
