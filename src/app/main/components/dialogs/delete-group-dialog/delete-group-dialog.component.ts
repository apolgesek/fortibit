import { ChangeDetectionStrategy, Component, ComponentRef } from '@angular/core';
import { IAdditionalData, IModal, ModalComponent } from '@app/shared';
import { GroupManager, ModalRef } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
@Component({
  selector: 'app-delete-group-dialog',
  templateUrl: './delete-group-dialog.component.html',
  styleUrls: ['./delete-group-dialog.component.scss'],
  standalone: true,
  imports: [
    AutofocusDirective,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
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
