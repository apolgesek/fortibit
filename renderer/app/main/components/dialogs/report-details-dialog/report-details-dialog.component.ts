import { Component, ComponentRef, inject, Input, OnInit } from '@angular/core';
import {
	EntryManager,
	ModalRef,
	ModalService,
	ReportService,
} from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { Report } from '@shared-renderer/report.model';
import { ExposedPasswordsTableComponent } from '@app/shared/components/tables/exposed-passwords-table/exposed-passwords-table.component';
import { WeakPasswordsTableComponent } from '@app/shared/components/tables/weak-passwords-table/weak-passwords-table.component';
import { ReportType } from '@app/core/enums';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { DatePipe } from '@angular/common';

@Component({
	selector: 'app-report-details-dialog',
	standalone: true,
	imports: [
		ModalComponent,
		WeakPasswordsTableComponent,
		ExposedPasswordsTableComponent,
		DatePipe,
	],
	templateUrl: './report-details-dialog.component.html',
	styleUrl: './report-details-dialog.component.scss',
})
export class ReportDetailsDialogComponent implements IModal, OnInit {
	@Input() additionalData?: IAdditionalData;

	reportType = ReportType;
	ref: ComponentRef<ReportDetailsDialogComponent>;
	report: Report;
	entries = [];

	private readonly modalRef = inject(ModalRef);
	private readonly reportService = inject(ReportService);
	private readonly modalService = inject(ModalService);
	private readonly entryManager = inject(EntryManager);

	ngOnInit(): void {
		this.report = this.reportService.reports.find(
			(x) => x.id === this.additionalData.payload.reportId,
		);
		this.entries = JSON.parse(this.report.payload);
	}

	close() {
		this.modalRef.close();
	}

	async editEntry(id: number) {
		const entry = await this.entryManager.get(id);
		this.modalService.openEditEntryWindow(entry as PasswordEntry);
	}
}
