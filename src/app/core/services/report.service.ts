import { Inject, Injectable } from '@angular/core';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { IReport } from '@shared-renderer/report.model';
import { exportDB } from 'dexie-export-import';
import { CommunicationService } from 'injection-tokens';
import { DbContext } from '../database';
import { ICommunicationService } from '../models';
import { EntryRepository, GroupRepository, ReportRepository } from '../repositories';
import { WorkspaceService } from './workspace.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly workspaceService: WorkspaceService,
    private readonly dbContext: DbContext,
    private readonly reportRepository: ReportRepository,
    private readonly entryRepository: EntryRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  async scanForLeaks(): Promise<any> {
    return new Promise(async (resolve) => {
      const blob = await exportDB(this.dbContext);

      const fr = new FileReader();
      fr.readAsText(blob);
      fr.onloadend = async () => {
        const data = await this.communicationService.ipcRenderer.invoke(IpcChannel.ScanLeaks, fr.result);

        resolve(data);
        this.workspaceService.dateSaved = null;
      };
    });
  }

  async getExposedPasswords(): Promise<any> {
    const report = await this.reportRepository.getLastReport();

    if (!report) {
      return;
    }

    const reportPayload = JSON.parse(report.payload);
    const reportIds: number[] = JSON.parse(report.payload).map(x => x.id);

    const entries = await this.entryRepository.getAllByPredicate(x => reportIds.includes(x.id));
    const groups = await this.groupRepository.getAll();

    const reportedEntries = entries.map(e => {
      return {
        groupName: groups.find(x => x.id === e.groupId).name,
        title: e.title,
        username: e.username,
        occurrences: reportPayload.find(x => x.id === e.id).occurrences,
      }}
    );

    return { report, entries: reportedEntries };
  }

  addReport(report: IReport): Promise<number> {
    return this.reportRepository.add(report);
  }
}