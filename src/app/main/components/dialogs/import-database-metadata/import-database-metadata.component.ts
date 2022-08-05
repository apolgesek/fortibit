import { Component, ComponentRef, Inject } from '@angular/core';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ModalManager } from '@app/core/services/modal-manager';
import { NotificationService } from '@app/core/services/notification.service';
import { StorageService } from '@app/core/services/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import * as path from 'path';

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
    private readonly modalManager: ModalManager,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly storageService: StorageService,
    private readonly notificationService: NotificationService
  ) {}

  async confirm() {
    try {
      this.isConfirmButtonLocked = true;
      const entries: string = await this.communicationService.ipcRenderer.invoke(IpcChannel.Import, this.additionalData?.payload.filePath, this.additionalData?.payload.type);
      let deserializedEntries: IPasswordEntry[] = JSON.parse(entries);

      deserializedEntries = deserializedEntries.map(x => ({...x, groupId: this.storageService.selectedCategory?.data.id}));

      const filePath = this.additionalData?.payload.filePath;
      await this.storageService.importDatabase(path.basename(filePath, path.extname(filePath)), deserializedEntries);

      this.notificationService.add({ type: 'success', message: 'Passwords imported successfully', alive: 5000 });
      this.close();
    } catch (err) {
      this.isConfirmButtonLocked = false;
    }
  }

  close() {
    this.modalManager.close(this.ref);
  }
}
