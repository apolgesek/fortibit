import { Component, ComponentRef, Inject } from '@angular/core';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { NotificationService } from '@app/core/services/notification.service';
import { IAdditionalData, IModal } from '@app/shared';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { WorkspaceService, GroupManager, ModalRef } from '@app/core/services';

@Component({
  selector: 'app-import-database-metadata',
  templateUrl: './import-database-metadata.component.html',
  styleUrls: ['./import-database-metadata.component.scss']
})
export class ImportDatabaseMetadataComponent implements IModal {
  ref!: ComponentRef<unknown>;
  additionalData?: IAdditionalData | undefined;
  isConfirmButtonLocked = false;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly groupManager: GroupManager,
    private readonly modalRef: ModalRef,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly notificationService: NotificationService
  ) {}

  async confirm() {
    try {
      this.isConfirmButtonLocked = true;
      const entries: string = await this.communicationService.ipcRenderer.invoke(IpcChannel.Import, this.additionalData?.payload.filePath, this.additionalData?.payload.type);
      let deserializedEntries: IPasswordEntry[] = JSON.parse(entries);

      deserializedEntries = deserializedEntries.map(x => ({...x, groupId: this.groupManager.selectedGroup}));

      const filePath = this.additionalData?.payload.filePath;
      await this.workspaceService.importDatabase(this.communicationService.path.parse(filePath).name, deserializedEntries);

      this.notificationService.add({ type: 'success', message: 'Passwords imported successfully', alive: 5000 });
      this.close();
    } catch (err) {
      this.isConfirmButtonLocked = false;
    }
  }

  close() {
    this.modalRef.close()
  }
}
