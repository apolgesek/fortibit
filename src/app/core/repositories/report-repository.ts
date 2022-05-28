import { Injectable } from '@angular/core';
import { IReport } from '@shared-renderer/report.model';
import { DbContext } from '../database/db-context';
import { IReportRepository } from './report-repository.model';

@Injectable({providedIn: 'root'})
export class ReportRepository implements IReportRepository {
  constructor(private readonly db: DbContext) {}

  add(report: IReport): Promise<number> {
    return this.db.transaction('rw', this.db.reports, () => {
      return this.db.reports.add(report);
    });
  }

  getLastReport(): Promise<IReport> {
    return this.db.transaction('r', this.db.reports, () => {
      return this.db.reports.orderBy('creationDate').reverse().first();
    });
  }
}