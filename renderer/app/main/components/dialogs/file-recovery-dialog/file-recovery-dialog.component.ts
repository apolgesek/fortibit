import { Component, ComponentRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IAdditionalData, IModal } from '@app/shared';
import { EntryManager, GroupManager, ModalRef, ModalService, WorkspaceService } from '@app/core/services';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { IMessageBroker } from '@app/core/models';
import { MessageBroker } from 'injection-tokens';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';

@Component({
  selector: 'app-file-recovery-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent
  ],
  templateUrl: './file-recovery-dialog.component.html',
  styleUrls: ['./file-recovery-dialog.component.scss']
})
export class FileRecoveryDialogComponent implements IModal {
  ref: ComponentRef<FileRecoveryDialogComponent>;
  additionalData?: IAdditionalData;
  showBackdrop?: boolean;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly modalService: ModalService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly modalRef: ModalRef
  ) {}

  async recover() {
    const recoveredDbContent = await this.messageBroker.ipcRenderer.invoke(IpcChannel.RecoverFile);
    await this.workspaceService.loadDatabase(recoveredDbContent);
    await this.entryManager.setByGroup(this.groupManager.selectedGroup);
    await this.entryManager.updateEntriesSource();
    this.workspaceService.isSynced = false;

    this.close();
  }

  async doNotRecover() {
    await this.messageBroker.ipcRenderer.invoke(IpcChannel.RemoveRecoveryFile);
    this.close();
  }

  close() {
    this.modalService.close(this.modalRef.ref);
  }
}
