import { IReport } from "@shared-renderer/report.model";

export interface IReportRepository {
  add(report: IReport): Promise<number>
  getLastReport(): Promise<IReport>;
}