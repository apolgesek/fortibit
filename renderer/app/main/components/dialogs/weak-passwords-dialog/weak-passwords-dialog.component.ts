import { Component, ComponentRef, Inject } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { combineLatest, from, take, timer } from 'rxjs';
import { ModalRef, ModalService, NotificationService, ReportService } from '@app/core/services';

import { CommunicationService } from 'injection-tokens';
import { CommonModule } from '@angular/common';
import { ReportType } from '@app/core/enums';
import { FeatherModule } from 'angular-feather';
import { EntryRepository } from '@app/core/repositories';

@Component({
  selector: 'app-weak-passwords-dialog',
  templateUrl: './weak-passwords-dialog.component.html',
  styleUrls: ['./weak-passwords-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule,
    
    ModalComponent
  ]
})
export class WeakPasswordsDialogComponent implements IModal {
  ref: ComponentRef<WeakPasswordsDialogComponent>;
  additionalData?: IAdditionalData;
  result = [];
  weakPasswordsFound = [];
  scanInProgress: boolean;
  lastReportLoaded = false;
  showDetails = false;
  showError = false;
  lastReport: any;

  private scoreMap = {
    0: 'High',
    1: 'High',
    2: 'Medium'
  };
  
  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly modalRef: ModalRef,
    private readonly reportService: ReportService,
    private readonly modalService: ModalService,
    private readonly entryRepository: EntryRepository,
    private readonly notificationService: NotificationService
  ) { }

  close() {
    this.modalRef.close();
  }

  async scan() {
    this.scanInProgress = true;

    combineLatest([
      from(this.reportService.scanForWeakPasswords()),
      timer(1000).pipe(take(1)),
    ]).subscribe({ next: async ([result]) => {
      if (result.error) {
        this.scanInProgress = false;
        this.showError = true;

        return;
      }

      const reportId = await this.reportService.addReport({
        creationDate: new Date(),
        type: ReportType.WeakPasswords,
        payload: result.data
      });
      
      await this.getLastReport();
      this.scanInProgress = false;
      
      if (this.weakPasswordsFound.length) {
        this.showDetails = true;
      }
    }, error: () => this.scanInProgress = false });
  }

  async saveReport() {
    await this.communicationService.ipcRenderer.invoke(
      IpcChannel.SaveWeakPasswordsReport,
      this.weakPasswordsFound.map(x => ({ ...x, score: this.scoreMap[x.score] }))
    );
    this.notificationService.add({ type: 'success', alive: 5000, message: 'Report generated' });
  }

  ngOnInit(): void {
    this.getLastReport();
  }

  openUrl(url: string) {
    this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, url);
  }

  public trackByFn(_: number, item: { id: number }) {
    return item.id;
  }
  
  async editEntry(id: number) {
    this.modalService.openEditEntryWindow(await this.entryRepository.get(id));
  }

  private async getLastReport() {
    const entries = await this.reportService.getWeakPasswords();

    if (entries) {
      this.lastReport = entries.report;
      this.result = entries.entries;
      this.weakPasswordsFound = this.result.filter(x => x.score <= 2);
    }

    this.lastReportLoaded = true;
  }
}
