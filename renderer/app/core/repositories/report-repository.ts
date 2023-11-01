import { Injectable, inject } from '@angular/core';
import { IReport } from '../../../../shared/report.model';
import { DbManager } from '../database/db-manager';
import { ReportType } from '../enums';
import { IReportRepository, PredicateFn } from './report-repository.model';

@Injectable({providedIn: 'root'})
export class ReportRepository implements IReportRepository {
  private readonly db = inject(DbManager);

  getAllByPredicate(fn: PredicateFn): Promise<IReport[]> {
    return this.db.context.transaction('r', this.db.reports,
      () => this.db.reports.filter(x => fn(x)).toArray());
  }

  getLastReport(type: ReportType): Promise<IReport> {
    return this.db.context.transaction('r', this.db.reports,
      () => this.db.reports
        .orderBy('creationDate')
        .reverse()
        .filter(x => x.type === type)
        .first()
    );
  }

  add(report: IReport): Promise<number> {
    return this.db.context.transaction('rw', this.db.reports,
      () => this.db.reports.add(report));
  }

  delete(id: number): Promise<void> {
    return this.db.context.transaction('rw', this.db.reports,
      () => this.db.reports.delete(id));
  }
}
