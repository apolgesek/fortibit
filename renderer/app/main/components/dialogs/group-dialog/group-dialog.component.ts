import { Component, ComponentRef, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupManager, ModalRef, NotificationService } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-group-dialog',
  templateUrl: './group-dialog.component.html',
  styleUrls: ['./group-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    AutofocusDirective,
    ModalComponent
  ]
})
export class GroupDialogComponent implements IModal, OnInit {
  public readonly ref!: ComponentRef<GroupDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly isControlInvalid = isControlInvalid;

  public groupForm: FormGroup;
  public title: 'Add group' | 'Edit group' = 'Add group';

  get name(): FormControl {
    return this.groupForm.get('name') as FormControl;
  }

  constructor(
    private readonly modalRef: ModalRef,
    private readonly fb: FormBuilder,
    private readonly groupManager: GroupManager,
    private readonly notificationService: NotificationService
  ) {
    this.groupForm = this.fb.group({
      name: [null, [Validators.required, Validators.maxLength(20)]]
    });
  }

  close() {
    this.modalRef.close();
  }

  async saveGroup() {
    markAllAsDirty(this.groupForm);

    if (this.groupForm.invalid) {
      return;
    }

    const name = this.groupForm.get('name').value;

    if (this.additionalData.payload.mode === 'new') {
      await this.groupManager.addGroup({ name: name });
    } else {
      await this.groupManager.updateGroup({ id: this.groupManager.selectedGroup, name: name });
    }

    this.notificationService.add({ type: 'success', alive: 5000, message: 'Group saved' });
    this.close();
  }
  
  ngOnInit(): void {
    const mode = this.additionalData?.payload?.mode;

    if (mode === 'edit') {
      this.title = 'Edit group';
      this.groupForm.get('name').setValue(this.groupManager.selectedGroupName);
    }
  }
}
