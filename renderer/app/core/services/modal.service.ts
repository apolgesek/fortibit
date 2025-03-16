import { ComponentRef, Injectable, inject } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { AboutDialogComponent } from '@app/main/components/dialogs/about-dialog/about-dialog.component';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { ConfirmUrlDialogComponent } from '@app/main/components/dialogs/confirm-url-dialog/confirm-url-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import {
	EntryHistoryDialogComponent,
	EntryHistoryDialogDataPayload,
} from '@app/main/components/dialogs/entry-history-dialog/entry-history-dialog.component';
import { ExposedPasswordsDialogComponent } from '@app/main/components/dialogs/exposed-passwords-dialog/exposed-passwords-dialog.component';
import {
	FileRecoveryDialogComponent,
	FileRecoveryDialogDataPayload,
} from '@app/main/components/dialogs/file-recovery-dialog/file-recovery-dialog.component';
import { GeneratorDialogComponent } from '@app/main/components/dialogs/generator-dialog/generator-dialog.component';
import {
	GroupDialogComponent,
	GroupDialogDataPayload,
} from '@app/main/components/dialogs/group-dialog/group-dialog.component';
import {
	ImportDatabaseMetadataDialogDataPayload,
	ImportDatabaseMetadataDialogComponent,
} from '@app/main/components/dialogs/import-database-metadata-dialog/import-database-metadata-dialog.component';
import { MaintenanceDialogComponent } from '@app/main/components/dialogs/maintenance-dialog/maintenance-dialog.component';
import { MoveEntryDialogComponent } from '@app/main/components/dialogs/move-entry-dialog/move-entry-dialog.component';
import { PasswordChangeDialogComponent } from '@app/main/components/dialogs/password-change-dialog/password-change-dialog.component';
import { SettingsDialogComponent } from '@app/main/components/dialogs/settings-dialog/settings-dialog.component';
import { WeakPasswordsDialogComponent } from '@app/main/components/dialogs/weak-passwords-dialog/weak-passwords-dialog.component';
import { ReportsLogDialogComponent } from '@app/main/components/dialogs/reports-log-dialog/reports-log-dialog.component';
import { ReportDetailsDialogComponent } from '@app/main/components/dialogs/report-details-dialog/report-details-dialog.component';
import { HistoryEntry, IpcChannel, Entry } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { EntryManager } from './managers/entry.manager';
import { ModalRef } from './modal-ref';
import { EntryDialogDataPayload } from '@app/shared';

@Injectable({
	providedIn: 'root',
})
export class ModalService {
	private readonly modalManager = inject(ModalManager);
	private readonly entryManager = inject(EntryManager);
	private readonly messageBroker = inject(MessageBroker);

	public get isAnyModalOpen(): boolean {
		return this.modalManager.isAnyModalOpen;
	}

	openDeleteEntryWindow(): ModalRef {
		return this.modalManager.open(DeleteEntryDialogComponent);
	}

	openDeleteGroupWindow(): ModalRef {
		return this.modalManager.open(DeleteGroupDialogComponent);
	}

	async openConfirmOpenUrlWindow(): Promise<boolean> {
		return this.modalManager.openPrompt(ConfirmUrlDialogComponent);
	}

	async openConfirmExitWindow(): Promise<boolean> {
		return this.modalManager.openPrompt(ConfirmExitDialogComponent);
	}

	async openNewEntryWindow(): Promise<ModalRef> {
		return this.openEntryWindow();
	}

	async openEditEntryWindow(entry?: Entry): Promise<ModalRef> {
		return this.openEntryWindow(entry ?? this.entryManager.selectedEntries[0]);
	}

	async openHistoryEntryWindow(historyEntry: HistoryEntry): Promise<ModalRef> {
		let decryptedPassword = '';
		if (historyEntry.entry.type === 'password') {
			decryptedPassword = await this.messageBroker.ipcRenderer.invoke(
				IpcChannel.DecryptPassword,
				historyEntry.entry.password,
			);
		}

		return this.modalManager.open<EntryDialogDataPayload>(
			EntryDialogComponent,
			{
				payload: {
					decryptedPassword,
					config: { readonly: true },
					historyEntry,
					entry: historyEntry.entry,
				},
			},
		);
	}

	openGroupWindow(mode: 'new' | 'edit' = 'new'): ModalRef {
		return this.modalManager.open<GroupDialogDataPayload>(
			GroupDialogComponent,
			{
				payload: { mode },
			},
		);
	}

	openAboutWindow(): ModalRef {
		return this.modalManager.open(AboutDialogComponent);
	}

	openSettingsWindow(): ModalRef {
		return this.modalManager.open(SettingsDialogComponent);
	}

	openImportedDbMetadataWindow(
		metadata: ImportDatabaseMetadataDialogDataPayload,
	): ModalRef {
		return this.modalManager.open<ImportDatabaseMetadataDialogDataPayload>(
			ImportDatabaseMetadataDialogComponent,
			{ payload: metadata },
		);
	}

	openExposedPasswordsWindow(): ModalRef {
		return this.modalManager.open(ExposedPasswordsDialogComponent);
	}

	openWeakPasswordsWindow(): ModalRef {
		return this.modalManager.open(WeakPasswordsDialogComponent);
	}

	openReportsWindow(): ModalRef {
		return this.modalManager.open(ReportsLogDialogComponent);
	}

	openReportDetailsWindow(reportId: number): ModalRef {
		return this.modalManager.open(ReportDetailsDialogComponent, {
			payload: {
				reportId,
			},
		});
	}

	openEntryHistoryWindow(): ModalRef {
		const selectedEntry = this.entryManager.selectedEntries[0];
		if (selectedEntry.type !== 'password') {
			return;
		}

		return this.modalManager.open<EntryHistoryDialogDataPayload>(
			EntryHistoryDialogComponent,
			{
				payload: { entry: selectedEntry },
			},
		);
	}

	openMoveEntryWindow(): ModalRef {
		return this.modalManager.open(MoveEntryDialogComponent);
	}

	openRecoveryWindow(path: string): ModalRef {
		return this.modalManager.open<FileRecoveryDialogDataPayload>(
			FileRecoveryDialogComponent,
			{
				payload: { path },
			},
		);
	}

	openPasswordChangeWindow(): ModalRef {
		return this.modalManager.open(PasswordChangeDialogComponent);
	}

	openMaintenanceWindow(): ModalRef {
		return this.modalManager.open(MaintenanceDialogComponent);
	}

	openGeneratorWindow(): ModalRef {
		return this.modalManager.open(GeneratorDialogComponent);
	}

	close<T>(ref: ComponentRef<T>) {
		this.modalManager.close(ref);
	}

	private async openEntryWindow(entry?: Entry): Promise<ModalRef> {
		let decryptedPassword;

		if (entry?.type === 'password') {
			decryptedPassword = await this.messageBroker.ipcRenderer.invoke(
				IpcChannel.DecryptPassword,
				entry.password,
			);
		}

		return this.modalManager.open<EntryDialogDataPayload>(
			EntryDialogComponent,
			{
				payload: { decryptedPassword, entry },
			},
		);
	}
}
