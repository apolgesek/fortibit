import { ChangeDetectionStrategy, Component, ComponentRef, OnInit } from '@angular/core';
import { GroupIds } from '@app/core/enums';
import { IAdditionalData, IModal } from '@app/shared';
import { EntryManager, GroupManager, ModalRef } from '@app/core/services';
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
    return this.entryManager.selectedPasswords.length;
  }

  constructor(
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly modalRef: ModalRef
  ) { }

  ngOnInit() {
    this.isInRecycleBin = this.groupManager.selectedGroup === GroupIds.RecycleBin;
  }

  async deleteEntry() {
    await this.entryManager.deleteEntry();

    this.close();
  }

  close() {
    this.modalRef.close()
  }
}
