import { Report } from '../../../../shared/report.model';

export type PredicateFn = (entry: Report) => boolean;

export interface IReportRepository {
	getAllByPredicate(fn: PredicateFn): Promise<Report[]>;
	getLastReport(type: number): Promise<Report>;
	add(report: Report): Promise<number>;
	delete(id: number): Promise<void>;
}
