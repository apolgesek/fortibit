import { ChangeDetectionStrategy, Component, ComponentRef } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { StorageService } from '@app/core/services/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
@Component({
  selector: 'app-delete-entry-dialog',
  templateUrl: './delete-entry-dialog.component.html',
  styleUrls: ['./delete-entry-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteEntryDialogComponent implements IModal {
  public readonly ref!: ComponentRef<DeleteEntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  get selectedRowsCount(): number {
    return this.storageService.selectedPasswords.length;
  }

  constructor(
    private storageService: StorageService,
    private modalService: ModalService
  ) { }

  deleteEntry() {
    this.storageService.deleteEntry();
    this.close();
  }

  close() {
    this.modalService.close(this.ref);
  }
}
