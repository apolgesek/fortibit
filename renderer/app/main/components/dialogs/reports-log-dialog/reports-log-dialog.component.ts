import { Component, ComponentRef, inject, Input, OnInit } from '@angular/core';
import { ModalRef, ModalService, ReportService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { DatePipe, NgClass } from '@angular/common';
import { ReportType } from '@app/core/enums';
import { FeatherModule } from 'angular-feather';
import { ConfigManager } from '@app/core/services/managers/config.manager';

enum Severity {
	ActionRequired,
	NoActionRequired,
}

interface Report {
	id: number;
	type: 'Weak passwords' | 'Exposed passwords' | 'Unspecified';
	date: number;
	scheduled: boolean;
	metadata: {
		count: number;
		severity: Severity;
	};
}

@Component({
	selector: 'app-reports-log-dialog',
	standalone: true,
	imports: [ModalComponent, DatePipe, NgClass, FeatherModule],
	templateUrl: './reports-log-dialog.component.html',
	styleUrl: './reports-log-dialog.component.scss',
})
export class ReportsLogDialogComponent implements IModal, OnInit {
	@Input() additionalData?: IAdditionalData;
	public readonly severity = Severity;

	ref: ComponentRef<ReportsLogDialogComponent>;
	reports: Report[] = [];
	nextScheduledReportsDate: number;
	isNextScheduledReportsDatePastDue = false;

	private readonly modalRef = inject(ModalRef);
	private readonly reportService = inject(ReportService);
	private readonly modalService = inject(ModalService);
	private readonly configManager = inject(ConfigManager);
	private readonly reportTypeMap: Record<ReportType, Report['type']> = {
		[ReportType.WeakPasswords]: 'Weak passwords',
		[ReportType.ExposedPasswords]: 'Exposed passwords',
		[ReportType.Unspecified]: 'Unspecified',
	};

	async ngOnInit() {
		this.reports = this.reportService.reports.map((x) => ({
			id: x.id,
			type: this.reportTypeMap[x.type],
			date: x.creationDate,
			metadata: this.getReportDetails(x.type, x.payload),
			scheduled: x.scheduled,
		}));

		this.nextScheduledReportsDate =
			this.configManager.configEntry?.nextScheduledReportsDate;
		this.isNextScheduledReportsDatePastDue =
			this.nextScheduledReportsDate > 0
				? this.nextScheduledReportsDate < +new Date()
				: false;
	}

	close() {
		this.modalRef.close();
	}

	openReportDetailsWindow(report: Report) {
		this.modalService.openReportDetailsWindow(report.id);
	}

	private getReportDetails(type: ReportType, payload: string) {
		switch (type) {
			case ReportType.WeakPasswords:
				return this.getWeakPasswordsReportDetails(payload);
			case ReportType.ExposedPasswords:
				return this.getExposedPasswordsReportDetails(payload);
			default:
				throw new Error(`Unknown report type: ${type}`);
		}
	}

	private getWeakPasswordsReportDetails(payload: string): Report['metadata'] {
		const count = JSON.parse(payload).filter((x) => x.score <= 2).length;

		return {
			count,
			severity: count > 0 ? Severity.ActionRequired : Severity.NoActionRequired,
		};
	}

	private getExposedPasswordsReportDetails(
		payload: string,
	): Report['metadata'] {
		const count = JSON.parse(payload).filter((x) => x.occurrences > 0).length;

		return {
			count,
			severity: count > 0 ? Severity.ActionRequired : Severity.NoActionRequired,
		};
	}
}
