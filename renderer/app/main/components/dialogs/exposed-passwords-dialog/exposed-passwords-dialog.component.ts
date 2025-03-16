import { CommonModule } from '@angular/common';
import { Component, ComponentRef, OnInit, inject } from '@angular/core';
import { ReportType } from '@app/core/enums';
import {
	EntryManager,
	ModalRef,
	ModalService,
	NotificationService,
	ReportService,
} from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { ExposedPasswordsTableComponent } from '@app/shared/components/tables/exposed-passwords-table/exposed-passwords-table.component';
import {
	ExposedPasswordEntry,
	IpcChannel,
	PasswordEntry,
	Report,
} from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { bufferTime, from } from 'rxjs';

@Component({
	selector: 'app-exposed-passwords-dialog',
	templateUrl: './exposed-passwords-dialog.component.html',
	styleUrls: ['./exposed-passwords-dialog.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FeatherModule,
		ModalComponent,
		ExposedPasswordsTableComponent,
	],
})
export class ExposedPasswordsDialogComponent implements IModal, OnInit {
	ref: ComponentRef<ExposedPasswordsDialogComponent>;
	additionalData?: IAdditionalData;
	result: ExposedPasswordEntry[] = [];
	exposedPasswordsFound: ExposedPasswordEntry[] = [];
	scanInProgress: boolean;
	lastReport: Report;
	lastReportLoaded = false;
	showDetails = false;
	showError = false;

	private readonly messageBroker = inject(MessageBroker);
	private readonly modalRef = inject(ModalRef);
	private readonly reportService = inject(ReportService);
	private readonly modalService = inject(ModalService);
	private readonly entryManager = inject(EntryManager);
	private readonly notificationService = inject(NotificationService);

	ngOnInit(): void {
		this.getLastReport();
	}

	close() {
		this.modalRef.close();
	}

	async scan() {
		this.exposedPasswordsFound = [];
		this.showError = false;
		this.showDetails = false;
		this.scanInProgress = true;

		from(this.reportService.scanForLeaks())
			.pipe(bufferTime(1000))
			.subscribe({
				next: async ([result]) => {
					if (result.error) {
						this.scanInProgress = false;
						this.showError = true;

						return;
					}

					const reportedEntries =
						await this.reportService.getExposedEntries(result);
					await this.reportService.addReport({
						creationDate: +new Date(),
						type: ReportType.ExposedPasswords,
						payload: JSON.stringify(reportedEntries),
					});

					await this.getLastReport();
					await this.entryManager.bulkMarkExposed(
						this.exposedPasswordsFound.map((x) => x.id),
					);

					this.scanInProgress = false;

					if (this.exposedPasswordsFound.length) {
						this.showDetails = true;
					}
				},
				error: () => (this.scanInProgress = false),
			});
	}

	async saveReport() {
		const saved = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.SaveExposedPasswordsReport,
			this.exposedPasswordsFound,
		);

		if (saved) {
			this.notificationService.add({
				type: 'success',
				alive: 10 * 1000,
				message: 'Report exported',
			});
		}
	}

	openUrl(url: string) {
		this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, url);
	}

	public trackByFn(_: number, item: { id: number }) {
		return item.id;
	}

	async editEntry(id: number) {
		const entry = await this.entryManager.get(id);
		this.modalService.openEditEntryWindow(entry as PasswordEntry);
	}

	private async getLastReport() {
		const exposedPasswords = await this.reportService.getExposedPasswords();

		if (exposedPasswords) {
			this.lastReport = exposedPasswords.report;
			this.result = exposedPasswords.entries;
			this.exposedPasswordsFound = this.result.filter((x) => x.occurrences > 0);
		}

		this.lastReportLoaded = true;
	}
}
