import { Component, ComponentRef, Inject, OnInit } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { bufferTime, from } from 'rxjs';
import {
	EntryManager,
	ModalRef,
	ModalService,
	NotificationService,
	ReportService,
} from '@app/core/services';
import { MessageBroker } from 'injection-tokens';
import { CommonModule } from '@angular/common';
import { ReportType } from '@app/core/enums';
import { FeatherModule } from 'angular-feather';
import { IpcChannel, PasswordEntry } from '@shared-renderer/index';

@Component({
	selector: 'app-exposed-passwords-dialog',
	templateUrl: './exposed-passwords-dialog.component.html',
	styleUrls: ['./exposed-passwords-dialog.component.scss'],
	standalone: true,
	imports: [CommonModule, FeatherModule, ModalComponent],
})
export class ExposedPasswordsDialogComponent implements IModal, OnInit {
	ref: ComponentRef<ExposedPasswordsDialogComponent>;
	additionalData?: IAdditionalData;
	result = [];
	exposedPasswordsFound = [];
	scanInProgress: boolean;
	lastReport: any;
	lastReportLoaded = false;
	showDetails = false;
	showError = false;

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly modalRef: ModalRef,
		private readonly reportService: ReportService,
		private readonly modalService: ModalService,
		private readonly entryManager: EntryManager,
		private readonly notificationService: NotificationService,
	) {}

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

					const reportId = await this.reportService.addReport({
						creationDate: new Date(),
						type: ReportType.ExposedPasswords,
						payload: result.data,
					});

					await this.getLastReport();
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
