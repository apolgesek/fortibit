import { Component, ComponentRef, OnInit, inject } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { EntryManager, GroupManager, ModalRef } from '@app/core/services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-entry-dialog',
  templateUrl: './delete-entry-dialog.component.html',
  styleUrls: ['./delete-entry-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent
  ],
})
export class DeleteEntryDialogComponent implements IModal, OnInit {
  public readonly ref!: ComponentRef<DeleteEntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public isInRecycleBin = false;

  private readonly groupManager = inject(GroupManager);
  private readonly entryManager = inject(EntryManager);
  private readonly modalRef = inject(ModalRef);

  get selectedRowsCount(): number {
    return this.entryManager.selectedPasswords.length;
  }

  ngOnInit() {
    this.isInRecycleBin = this.groupManager.selectedGroup === GroupId.RecycleBin;
  }

  async deleteEntry() {
    await this.entryManager.deleteEntry();

    this.close();
  }

  close() {
    this.modalRef.close();
  }
}
