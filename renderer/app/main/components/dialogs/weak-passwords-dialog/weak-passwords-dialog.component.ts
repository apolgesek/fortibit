import { CommonModule } from '@angular/common';
import { Component, ComponentRef, Inject, OnInit } from '@angular/core';
import { ReportType } from '@app/core/enums';
import { IMessageBroker } from '@app/core/models';
import {
	EntryManager,
	ModalRef,
	ModalService,
	NotificationService,
	ReportService,
} from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { IpcChannel, PasswordEntry } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { bufferTime, from } from 'rxjs';

@Component({
	selector: 'app-weak-passwords-dialog',
	templateUrl: './weak-passwords-dialog.component.html',
	styleUrls: ['./weak-passwords-dialog.component.scss'],
	standalone: true,
	imports: [CommonModule, FeatherModule, ModalComponent],
})
export class WeakPasswordsDialogComponent implements IModal, OnInit {
	ref: ComponentRef<WeakPasswordsDialogComponent>;
	additionalData?: IAdditionalData;
	result = [];
	weakPasswordsFound = [];
	scanInProgress: boolean;
	lastReportLoaded = false;
	showDetails = false;
	showError = false;
	lastReport: any;

	private scoreMap = {
		0: 'High',
		1: 'High',
		2: 'Medium',
	};

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly modalRef: ModalRef,
		private readonly reportService: ReportService,
		private readonly modalService: ModalService,
		private readonly entryManager: EntryManager,
		private readonly notificationService: NotificationService,
	) {}

	close() {
		this.modalRef.close();
	}

	async scan() {
		this.scanInProgress = true;

		from(this.reportService.scanForWeakPasswords())
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
						type: ReportType.WeakPasswords,
						payload: result.data,
					});

					await this.getLastReport();
					this.scanInProgress = false;

					if (this.weakPasswordsFound.length) {
						this.showDetails = true;
					}
				},
				error: () => (this.scanInProgress = false),
			});
	}

	async saveReport() {
		const saved = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.SaveWeakPasswordsReport,
			this.weakPasswordsFound.map((x) => ({
				...x,
				score: this.scoreMap[x.score],
			})),
		);

		if (saved) {
			this.notificationService.add({
				type: 'success',
				alive: 10 * 1000,
				message: 'Report exported',
			});
		}
	}

	ngOnInit(): void {
		this.getLastReport();
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
		const entries = await this.reportService.getWeakPasswords();

		if (entries) {
			this.lastReport = entries.report;
			this.result = entries.entries;
			this.weakPasswordsFound = this.result.filter((x) => x.score <= 2);
		}

		this.lastReportLoaded = true;
	}
}
