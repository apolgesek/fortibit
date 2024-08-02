import { Component, ComponentRef, inject } from '@angular/core';
import {
	EntryManager,
	GroupManager,
	ModalRef,
	ModalService,
	WorkspaceService,
} from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';

export type FileRecoveryDialogDataPayload = {
	path: string;
};

@Component({
	selector: 'app-file-recovery-dialog',
	standalone: true,
	imports: [ModalComponent],
	templateUrl: './file-recovery-dialog.component.html',
	styleUrls: ['./file-recovery-dialog.component.scss'],
})
export class FileRecoveryDialogComponent implements IModal {
	ref: ComponentRef<FileRecoveryDialogComponent>;
	additionalData?: IAdditionalData<FileRecoveryDialogDataPayload>;
	showBackdrop?: boolean;

	private readonly messageBroker = inject(MessageBroker);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly modalService = inject(ModalService);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly modalRef = inject(ModalRef);

	async recover() {
		const recoveredDbContent = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.RecoverFile,
		);
		await this.workspaceService.loadDatabase(recoveredDbContent);
		await this.entryManager.setByGroup(this.groupManager.selectedGroup);
		await this.entryManager.updateEntriesSource();
		this.workspaceService.isSynced = false;

		this.close();
	}

	async doNotRecover() {
		await this.messageBroker.ipcRenderer.invoke(IpcChannel.RemoveRecoveryFile);
		this.close();
	}

	close() {
		this.modalService.close(this.modalRef.ref);
	}
}
