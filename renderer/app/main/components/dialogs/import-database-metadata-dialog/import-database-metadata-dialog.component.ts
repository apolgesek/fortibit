import { Component, ComponentRef, inject, Input } from '@angular/core';
import { ModalRef, WorkspaceService } from '@app/core/services';
import { NotificationService } from '@app/core/services/notification.service';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import {
	PasswordEntry,
	ImportHandler,
	IpcChannel,
} from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';

export type ImportDatabaseMetadataDialogDataPayload = {
	filePath: string;
	size: number;
	type: ImportHandler;
};

@Component({
	selector: 'app-import-database-metadata-dialog',
	templateUrl: './import-database-metadata-dialog.component.html',
	styleUrls: ['./import-database-metadata-dialog.component.scss'],
	standalone: true,
	imports: [ModalComponent],
})
export class ImportDatabaseMetadataDialogComponent implements IModal {
	@Input()
	additionalData?: IAdditionalData<ImportDatabaseMetadataDialogDataPayload>;

	ref!: ComponentRef<ImportDatabaseMetadataDialogComponent>;
	isConfirmButtonLocked = false;

	private readonly workspaceService = inject(WorkspaceService);
	private readonly modalRef = inject(ModalRef);
	private readonly messageBroker = inject(MessageBroker);
	private readonly notificationService = inject(NotificationService);

	async confirm() {
		try {
			this.isConfirmButtonLocked = true;
			const entries: string = await this.messageBroker.ipcRenderer.invoke(
				IpcChannel.Import,
				this.additionalData?.payload.filePath,
				this.additionalData?.payload.type,
			);
			let deserializedEntries: PasswordEntry[] = JSON.parse(entries);
			deserializedEntries = deserializedEntries.map((x) => ({
				...x,
				creationDate: new Date(),
			}));

			const filePath: string = this.additionalData?.payload.filePath;
			const fileNameParts = filePath.split('.');
			fileNameParts.pop();

			await this.workspaceService.importDatabase(
				fileNameParts.join(''),
				deserializedEntries,
			);

			this.notificationService.add({
				type: 'success',
				message: 'Passwords imported',
				alive: 10 * 1000,
			});
			this.close();
		} catch (err) {
			this.notificationService.add({
				type: 'error',
				message: err,
				alive: 10 * 1000,
			});
			this.isConfirmButtonLocked = false;
		}
	}

	close() {
		this.modalRef.close();
	}
}
