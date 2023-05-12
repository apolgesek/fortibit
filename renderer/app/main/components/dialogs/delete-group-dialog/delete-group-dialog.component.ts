import { Component, ComponentRef } from '@angular/core';
import { GroupManager, ModalRef } from '@app/core/services';

import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

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
    private readonly modalRef: ModalRef
  ) { }

  async removeGroup() {
    await this.groupManager.removeGroup();

    this.close();
  }

  close() {
    this.modalRef.close()
  }
}
