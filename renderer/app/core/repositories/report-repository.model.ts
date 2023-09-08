import { IReport } from '../../../../shared/report.model';

export type PredicateFn = (entry: IReport) => boolean;

export interface IReportRepository {
  getAllByPredicate(fn: PredicateFn): Promise<IReport[]>;
  getLastReport(type: number): Promise<IReport>;
  add(report: IReport): Promise<number>;
  delete(id: number): Promise<void>;
}
