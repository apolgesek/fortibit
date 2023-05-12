import { Component, ComponentRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IAdditionalData, IModal } from '@app/shared';
import { EntryManager, GroupManager, ModalRef, ModalService, WorkspaceService } from '@app/core/services';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { ICommunicationService } from '@app/core/models';
import { CommunicationService } from 'injection-tokens';
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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly workspaceService: WorkspaceService,
    private readonly modalService: ModalService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly modalRef: ModalRef
  ) {}

  async recover() {
    const recoveredDbContent = await this.communicationService.ipcRenderer.invoke(IpcChannel.RecoverFile);
    await this.workspaceService.loadDatabase(recoveredDbContent);
    await this.entryManager.setByGroup(this.groupManager.selectedGroup);
    await this.entryManager.updateEntriesSource();
    this.workspaceService.isSynced = false;
    
    this.close();
  }

  async doNotRecover() {
    await this.communicationService.ipcRenderer.invoke(IpcChannel.RemoveRecoveryFile);
    this.close();
  }

  close() {
    this.modalService.close(this.modalRef.ref);
  }
}
