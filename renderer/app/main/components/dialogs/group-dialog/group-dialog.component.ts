import { Component, ComponentRef, DestroyRef, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupManager, ModalRef, ModalService, NotificationService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-group-dialog',
  templateUrl: './group-dialog.component.html',
  styleUrls: ['./group-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    ModalComponent
  ]
})
export class GroupDialogComponent implements IModal, OnInit {
  public readonly ref!: ComponentRef<GroupDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly isControlInvalid = isControlInvalid;

  public groupForm: FormGroup;
  public title: 'Add group' | 'Edit group' = 'Add group';

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly modalRef: ModalRef,
    private readonly fb: FormBuilder,
    private readonly groupManager: GroupManager,
    private readonly notificationService: NotificationService,
    private readonly modalService: ModalService
  ) {
    this.groupForm = this.fb.group({
      name: [null, [Validators.required, Validators.maxLength(40)]]
    });
  }

  get name(): FormControl {
    return this.groupForm.get('name') as FormControl;
  }

  close() {
    this.modalRef.close();
  }

  async saveGroup(): Promise<void> {
    markAllAsDirty(this.groupForm);

    if (this.groupForm.invalid) {
      return;
    }

    const name = this.groupForm.get('name').value;

    if (this.additionalData.payload.mode === 'new') {
      await this.groupManager.addGroup({ name });
    } else {
      await this.groupManager.updateGroup({
        id: this.groupManager.selectedGroup,
        name,
        lastModificationDate: new Date()
      });
    }

    this.notificationService.add({ type: 'success', alive: 10 * 1000, message: 'Group saved' });
    this.close();
  }

  async removeGroup() {
    const modalRef = this.modalService.openDeleteGroupWindow();
    modalRef.onActionResult.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.close();
    });
  }

  ngOnInit(): void {
    const mode = this.additionalData?.payload?.mode;

    if (mode === 'edit') {
      this.title = 'Edit group';
      this.groupForm.get('name').setValue(this.groupManager.selectedGroupName);
    }
  }
}