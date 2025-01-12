import { Component, ComponentRef, inject } from '@angular/core';
import {
	EntryManager,
	GroupManager,
	ModalRef,
	NotificationService,
	SearchService,
} from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { GroupId } from '@app/core/enums';

@Component({
	selector: 'app-delete-group-dialog',
	templateUrl: './delete-group-dialog.component.html',
	styleUrls: ['./delete-group-dialog.component.scss'],
	standalone: true,
	imports: [ModalComponent],
})
export class DeleteGroupDialogComponent implements IModal {
	public readonly ref!: ComponentRef<DeleteGroupDialogComponent>;
	public readonly additionalData!: IAdditionalData;

	private readonly groupManager = inject(GroupManager);
	private readonly entryManager = inject(EntryManager);
	private readonly searchService = inject(SearchService);
	private readonly modalRef = inject(ModalRef);
	private readonly notificationService = inject(NotificationService);

	async removeGroup() {
		await this.groupManager.removeGroup();
		await this.entryManager.setByGroup(GroupId.AllItems);
		this.searchService.reset();
		this.entryManager.updateEntriesSource();
		this.entryManager.reloadEntries();

		this.modalRef.onActionResult.next(true);
		this.modalRef.onActionResult.complete();

		this.close();

		this.notificationService.add({
			type: 'success',
			alive: 5000,
			message: 'Group removed',
		});
	}

	close() {
		this.modalRef.close();
	}
}
