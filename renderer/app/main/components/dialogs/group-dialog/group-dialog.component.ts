import { NgIf } from '@angular/common';
import {
	Component,
	ComponentRef,
	DestroyRef,
	OnInit,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	FormBuilder,
	FormControl,
	ReactiveFormsModule,
	Validators,
} from '@angular/forms';
import {
	GroupManager,
	ModalRef,
	ModalService,
	NotificationService,
} from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { FeatherModule } from 'angular-feather';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

export type GroupDialogDataPayload = {
	mode: 'new' | 'edit';
};

@Component({
	selector: 'app-group-dialog',
	templateUrl: './group-dialog.component.html',
	styleUrls: ['./group-dialog.component.scss'],
	standalone: true,
	imports: [NgIf, ReactiveFormsModule, FeatherModule, ModalComponent],
})
export class GroupDialogComponent implements IModal, OnInit {
	public readonly ref!: ComponentRef<GroupDialogComponent>;
	public readonly additionalData!: IAdditionalData<GroupDialogDataPayload>;
	public readonly isControlInvalid = isControlInvalid;

	public title: 'Add group' | 'Edit group' = 'Add group';

	private readonly fb = inject(FormBuilder);
	private readonly _groupForm = this.fb.group({
		name: ['', [Validators.required, Validators.maxLength(40)]],
	});

	get groupForm() {
		return this._groupForm;
	}

	constructor(
		private readonly destroyRef: DestroyRef,
		private readonly modalRef: ModalRef,
		private readonly groupManager: GroupManager,
		private readonly notificationService: NotificationService,
		private readonly modalService: ModalService,
	) {}

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

		const name = this.groupForm.controls.name.value;

		if (this.additionalData.payload.mode === 'new') {
			await this.groupManager.addGroup({ name });
		} else {
			await this.groupManager.updateGroup({
				id: this.groupManager.selectedGroup,
				name,
			});
		}

		this.notificationService.add({
			type: 'success',
			alive: 10 * 1000,
			message: 'Group saved',
		});
		this.close();
	}

	async removeGroup() {
		const modalRef = this.modalService.openDeleteGroupWindow();
		modalRef.onActionResult
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.close();
			});
	}

	ngOnInit(): void {
		if (this.additionalData?.payload?.mode === 'edit') {
			this.title = 'Edit group';
			this.groupForm.controls.name.setValue(
				this.groupManager.selectedGroupName,
			);
		}
	}
}
