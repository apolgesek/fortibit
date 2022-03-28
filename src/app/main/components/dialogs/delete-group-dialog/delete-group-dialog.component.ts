import { ChangeDetectionStrategy, Component, ComponentRef } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { StorageService } from '@app/core/services/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
@Component({
  selector: 'app-delete-group-dialog',
  templateUrl: './delete-group-dialog.component.html',
  styleUrls: ['./delete-group-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteGroupDialogComponent implements IModal {
  public readonly ref!: ComponentRef<DeleteGroupDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly storageService: StorageService,
    private readonly modalService: ModalService
  ) { }

  removeGroup() {
    this.storageService.removeGroup();
    this.close();
  }

  close() {
    this.modalService.close(this.ref);
  }
}
