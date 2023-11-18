import { Injectable, inject } from '@angular/core';
import { ReportType } from '@app/core/enums';
import { Subject } from 'rxjs';
import { IReport } from '../../../../../shared';
import { DbManager } from '../../database/db-manager';
import { ReportRepository } from '../../repositories/report-repository';
import { PredicateFn } from '../../repositories/report-repository.model';

@Injectable({ providedIn: 'root' })
export class ReportManager {
  public readonly markDirtySource: Subject<void> = new Subject();
  private readonly reportRepository: ReportRepository = new ReportRepository(inject(DbManager));

  async getAllByPredicate(fn: PredicateFn): Promise<IReport[] | undefined> {
    return this.reportRepository.getAllByPredicate(fn);
  }

  async getLastReport(type: ReportType): Promise<IReport> {
    return this.reportRepository.getLastReport(type);
  }

  async add(item: IReport): Promise<number> {
    this.markDirty();
    return this.reportRepository.add(item);
  }

  async delete(id: number): Promise<void> {
    return this.reportRepository.delete(id);
  }

  private markDirty() {
    this.markDirtySource.next();
  }
}