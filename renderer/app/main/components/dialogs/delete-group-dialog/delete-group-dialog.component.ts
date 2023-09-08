import { Component, ComponentRef } from '@angular/core';
import { EntryManager, GroupManager, ModalRef, SearchService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { GroupId } from '@app/core/enums';

@Component({
  selector: 'app-delete-group-dialog',
  templateUrl: './delete-group-dialog.component.html',
  styleUrls: ['./delete-group-dialog.component.scss'],
  standalone: true,
  imports: [

    ModalComponent
  ],
})
export class DeleteGroupDialogComponent implements IModal {
  public readonly ref!: ComponentRef<DeleteGroupDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly searchService: SearchService,
    private readonly modalRef: ModalRef
  ) { }

  async removeGroup() {
    await this.groupManager.removeGroup();
    await this.entryManager.setByGroup(GroupId.AllItems);
    this.searchService.reset();
    this.entryManager.updateEntriesSource();
    this.entryManager.reloadEntries();

    this.modalRef.onActionResult.next(true);
    this.modalRef.onActionResult.complete();

    this.close();
  }

  close() {
    this.modalRef.close();
  }
}
