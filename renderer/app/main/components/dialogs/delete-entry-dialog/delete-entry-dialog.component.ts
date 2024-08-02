import { Component, ComponentRef, OnInit, inject } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import {
	EntryManager,
	GroupManager,
	ModalRef,
	NotificationService,
} from '@app/core/services';

@Component({
	selector: 'app-delete-entry-dialog',
	templateUrl: './delete-entry-dialog.component.html',
	styleUrls: ['./delete-entry-dialog.component.scss'],
	standalone: true,
	imports: [ModalComponent],
})
export class DeleteEntryDialogComponent implements IModal, OnInit {
	public readonly ref!: ComponentRef<DeleteEntryDialogComponent>;
	public readonly additionalData!: IAdditionalData;
	public isInRecycleBin = false;

	private readonly groupManager = inject(GroupManager);
	private readonly entryManager = inject(EntryManager);
	private readonly modalRef = inject(ModalRef);
	private readonly notificationService = inject(NotificationService);

	get selectedRowsCount(): number {
		return this.entryManager.selectedEntries.length;
	}

	ngOnInit() {
		this.isInRecycleBin =
			this.groupManager.selectedGroup === GroupId.RecycleBin;
	}

	async deleteEntry() {
		const removedEntries = await this.entryManager.deleteEntry();

		this.close();

		this.notificationService.add({
			type: 'success',
			alive: 5000,
			message: `${removedEntries.length > 1 ? 'Entries' : 'Entry'} removed`,
		});
	}

	close() {
		this.modalRef.close();
	}
}
