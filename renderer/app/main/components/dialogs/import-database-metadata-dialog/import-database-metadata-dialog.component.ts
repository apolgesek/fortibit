import { Component, ComponentRef, Inject } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { NotificationService } from '@app/core/services/notification.service';
import { IPasswordEntry, IpcChannel } from '../../../../../../shared/index';
import { WorkspaceService, ModalRef } from '@app/core/services';
import { MessageBroker } from 'injection-tokens';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-import-database-metadata-dialog',
  templateUrl: './import-database-metadata-dialog.component.html',
  styleUrls: ['./import-database-metadata-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent
  ]
})
export class ImportDatabaseMetadataDialogComponent implements IModal {
  ref!: ComponentRef<ImportDatabaseMetadataDialogComponent>;
  additionalData?: IAdditionalData | undefined;
  isConfirmButtonLocked = false;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly modalRef: ModalRef,
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly notificationService: NotificationService
  ) {}

  async confirm() {
    try {
      this.isConfirmButtonLocked = true;
      const entries: string = await this.messageBroker.ipcRenderer
        .invoke(IpcChannel.Import, this.additionalData?.payload.filePath, this.additionalData?.payload.type);
      let deserializedEntries: IPasswordEntry[] = JSON.parse(entries);
      deserializedEntries = deserializedEntries.map(x => ({...x, creationDate: new Date()}));

      const filePath: string = this.additionalData?.payload.filePath;
      const fileNameParts = filePath.split('.');
      fileNameParts.pop();

      await this.workspaceService.importDatabase(fileNameParts.join(''), deserializedEntries);

      this.notificationService.add({ type: 'success', message: 'Passwords imported', alive: 10 * 1000 });
      this.close();
    } catch (err) {
      this.notificationService.add({ type: 'error', message: err, alive: 8000 });
      this.isConfirmButtonLocked = false;
    }
  }

  close() {
    this.modalRef.close();
  }
}
