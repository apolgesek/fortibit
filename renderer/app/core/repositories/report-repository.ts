import { Report } from '../../../../shared/report.model';
import { DbManager } from '../database/db-manager';
import { ReportType } from '../enums';
import { IReportRepository, PredicateFn } from './report-repository.model';

export class ReportRepository implements IReportRepository {
	constructor(private readonly db: DbManager) {}

	get(id: number): Promise<Report | undefined> {
		return this.db.context.transaction('r', this.db.reports, () =>
			this.db.reports.get(id),
		);
	}

	getAll(): Promise<Report[]> {
		return this.db.context.transaction('r', this.db.reports, () =>
			this.db.reports.orderBy('creationDate').reverse().toArray(),
		);
	}

	getAllByPredicate(fn: PredicateFn): Promise<Report[]> {
		return this.db.context.transaction('r', this.db.reports, () =>
			this.db.reports.filter((x) => fn(x)).toArray(),
		);
	}

	getLastReport(type: ReportType): Promise<Report> {
		return this.db.context.transaction('r', this.db.reports, () =>
			this.db.reports
				.orderBy('creationDate')
				.reverse()
				.filter((x) => x.type === type)
				.first(),
		);
	}

	add(report: Report): Promise<number> {
		return this.db.context.transaction('rw', this.db.reports, async () => {
			const id = await this.db.reports.add(report);

			const reports = await this.db.reports
				.orderBy('creationDate')
				.reverse()
				.toArray();
			const reportsToDelete = reports.slice(20);

			if (reportsToDelete.length > 0) {
				await this.db.reports.bulkDelete(reportsToDelete.map((x) => x.id));
			}

			return id;
		});
	}

	delete(id: number): Promise<void> {
		return this.db.context.transaction('rw', this.db.reports, () =>
			this.db.reports.delete(id),
		);
	}

	bulkDelete(ids: number[]): Promise<void> {
		return this.db.context.transaction('rw', this.db.reports, () =>
			this.db.reports.bulkDelete(ids),
		);
	}
}
