import { Component, ComponentRef, Inject } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { NotificationService } from '@app/core/services/notification.service';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { WorkspaceService, ModalRef, ElectronService } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-import-database-metadata',
  templateUrl: './import-database-metadata.component.html',
  styleUrls: ['./import-database-metadata.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AutofocusDirective,
    ModalComponent
  ]
})
export class ImportDatabaseMetadataComponent implements IModal {
  ref!: ComponentRef<unknown>;
  additionalData?: IAdditionalData | undefined;
  isConfirmButtonLocked = false;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly modalRef: ModalRef,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly notificationService: NotificationService
  ) {}

  async confirm() {
    try {
      this.isConfirmButtonLocked = true;
      const entries: string = await this.communicationService.ipcRenderer.invoke(IpcChannel.Import, this.additionalData?.payload.filePath, this.additionalData?.payload.type);
      let deserializedEntries: IPasswordEntry[] = JSON.parse(entries);
      deserializedEntries = deserializedEntries.map(x => ({...x, creationDate: new Date()}));

      const filePath = this.additionalData?.payload.filePath;
      await this.workspaceService.importDatabase((this.communicationService as ElectronService).path.parse(filePath).name, deserializedEntries);

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
