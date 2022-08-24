import { ChangeDetectionStrategy, Component, ComponentRef } from '@angular/core';
import { StorageService } from '@app/core/services/managers/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalRef } from '@app/core/services';
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
    private readonly modalRef: ModalRef
  ) { }

  removeGroup() {
    this.storageService.removeGroup();
    this.close();
  }

  close() {
    this.modalRef.close()
  }
}
