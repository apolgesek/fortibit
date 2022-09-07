import { ChangeDetectionStrategy, Component, ComponentRef } from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';
import { GroupManager, ModalRef } from '@app/core/services';
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
    private readonly groupManager: GroupManager,
    private readonly modalRef: ModalRef
  ) { }

  removeGroup() {
    this.groupManager.removeGroup();
    this.close();
  }

  close() {
    this.modalRef.close()
  }
}
