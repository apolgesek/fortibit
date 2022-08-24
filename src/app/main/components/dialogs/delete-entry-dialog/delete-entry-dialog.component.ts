import { ChangeDetectionStrategy, Component, ComponentRef, OnInit } from '@angular/core';
import { GroupIds } from '@app/core/enums';
import { StorageService } from '@app/core/services/managers/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalRef } from '@app/core/services';
@Component({
  selector: 'app-delete-entry-dialog',
  templateUrl: './delete-entry-dialog.component.html',
  styleUrls: ['./delete-entry-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteEntryDialogComponent implements IModal, OnInit {
  public readonly ref!: ComponentRef<DeleteEntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public isInRecycleBin = false;

  get selectedRowsCount(): number {
    return this.storageService.selectedPasswords.length;
  }

  constructor(
    private readonly storageService: StorageService,
    private readonly modalRef: ModalRef
  ) { }

  ngOnInit() {
    this.isInRecycleBin = this.storageService.selectedCategory.data.id === GroupIds.RecycleBin;
  }

  deleteEntry() {
    this.storageService.deleteEntry();
    this.close();
  }

  close() {
    this.modalRef.close()
  }
}
