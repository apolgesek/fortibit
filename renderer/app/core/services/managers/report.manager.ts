import { Injectable, inject } from '@angular/core';
import { ReportType } from '@app/core/enums';
import { Subject } from 'rxjs';
import { Report } from '../../../../../shared';
import { DbManager } from '../../database/db-manager';
import { ReportRepository } from '../../repositories/report-repository';
import { PredicateFn } from '../../repositories/report-repository.model';

@Injectable({ providedIn: 'root' })
export class ReportManager {
	public readonly markDirtySource = new Subject<void>();
	private readonly maxReports = 20;
	private readonly reportRepository: ReportRepository = new ReportRepository(
		inject(DbManager),
	);

	async get(id: number): Promise<Report | undefined> {
		return this.reportRepository.get(id);
	}

	async getAll(): Promise<Report[]> {
		return this.reportRepository.getAll();
	}

	async getAllByPredicate(fn: PredicateFn): Promise<Report[] | undefined> {
		return this.reportRepository.getAllByPredicate(fn);
	}

	async getLastReport(type: ReportType): Promise<Report> {
		return this.reportRepository.getLastReport(type);
	}

	async add(item: Report): Promise<number> {
		const id = await this.reportRepository.add(item);

		this.markDirty();

		return id;
	}

	private markDirty() {
		this.markDirtySource.next();
	}
}
