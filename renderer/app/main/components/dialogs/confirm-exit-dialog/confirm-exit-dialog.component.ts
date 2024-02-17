import { Component, ComponentRef, inject } from '@angular/core';
import { WorkspaceService, ModalRef } from '@app/core/services';
import { MessageBroker } from 'injection-tokens';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IpcChannel } from '@shared-renderer/index';

@Component({
	selector: 'app-confirm-exit-dialog',
	templateUrl: './confirm-exit-dialog.component.html',
	styleUrls: ['./confirm-exit-dialog.component.scss'],
	standalone: true,
	imports: [ModalComponent],
})
export class ConfirmExitDialogComponent implements IModal {
	public readonly ref!: ComponentRef<ConfirmExitDialogComponent>;
	public readonly additionalData!: IAdditionalData;

	private readonly workspaceService = inject(WorkspaceService);
	private readonly modalRef = inject(ModalRef);

	async saveChanges() {
		const result = await this.workspaceService.saveDatabase();
		
		setTimeout(() => {
			this.executeTask();
		}, 500);
	}

	executeTask() {
		this.modalRef.onActionResult.next(true);
		this.modalRef.onActionResult.complete();

		this.modalRef.close();
	}

	close() {
		this.modalRef.onActionResult.next(false);
		this.modalRef.onActionResult.complete();

		this.modalRef.close();
	}
}
