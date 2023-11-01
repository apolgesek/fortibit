import { Injectable, inject } from '@angular/core';
import { IReport, IpcChannel } from '@shared-renderer/index';
import { exportDB } from 'dexie-export-import';
import { MessageBroker } from 'injection-tokens';
import { DbManager } from '../database';
import { ReportType } from '../enums';
import { ReportRepository } from '../repositories';
import { EntryManager } from './managers/entry.manager';
import { GroupManager } from './managers/group.manager';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly messageBroker = inject(MessageBroker);
  private readonly db = inject(DbManager);
  private readonly reportRepository = inject(ReportRepository);
  private readonly entryManager = inject(EntryManager);
  private readonly groupManager = inject(GroupManager);

  async scanForLeaks(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const blob = await exportDB(this.db.context);

      const fr = new FileReader();
      fr.readAsText(blob);
      fr.onloadend = async () => {
        try {
          const data = await this.messageBroker.ipcRenderer.invoke(IpcChannel.ScanLeaks, fr.result);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
    });
  }

  async getExposedPasswords(): Promise<any> {
    const report = await this.reportRepository.getLastReport(ReportType.ExposedPasswords);

    if (!report) {
      return;
    }

    const reportPayload = JSON.parse(report.payload);
    const reportIds: number[] = JSON.parse(report.payload).map(x => x.id);

    const entries = await this.entryManager.getAllByPredicate(x => reportIds.includes(x.id));
    const groups = await this.groupManager.getAll();

    const reportedEntries = entries.map(e => ({
      id: e.id,
      groupName: groups.find(x => x.id === e.groupId).name,
      title: e.title,
      username: e.username,
      occurrences: reportPayload.find(x => x.id === e.id).occurrences,
    }));

    return { report, entries: reportedEntries };
  }

  async scanForWeakPasswords(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const blob = await exportDB(this.db.context);

      const fr = new FileReader();
      fr.readAsText(blob);
      fr.onloadend = async () => {
        try {
          const data = await this.messageBroker.ipcRenderer.invoke(IpcChannel.GetWeakPasswords, fr.result);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
    });
  }

  async getWeakPasswords(): Promise<any> {
    const report = await this.reportRepository.getLastReport(ReportType.WeakPasswords);

    if (!report) {
      return;
    }

    const reportPayload = JSON.parse(report.payload);
    const reportIds: number[] = JSON.parse(report.payload).map(x => x.id);
    const entries = await this.entryManager.getAllByPredicate(x => reportIds.includes(x.id));
    const groups = await this.groupManager.getAll();

    const reportedEntries = entries.map(e => ({
      id: e.id,
      title: e.title,
      username: e.username,
      score: reportPayload.find(x => x.id === e.id).score
    })
    );

    return { report, entries: reportedEntries };
  }

  async addReport(report: Partial<IReport>): Promise<number> {
    const reports = await this.reportRepository.getAllByPredicate(x => x.type === report.type);

    if (reports.length >= 1) {
      await this.reportRepository.delete(reports.shift().id);
    }

    return this.reportRepository.add(report as IReport);
  }
}
