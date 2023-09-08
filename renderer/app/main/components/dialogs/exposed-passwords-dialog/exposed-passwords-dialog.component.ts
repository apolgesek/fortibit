import { Component, ComponentRef, Inject, OnInit } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IpcChannel } from '../../../../../../shared/ipc-channel.enum';
import { combineLatest, from, take, timer } from 'rxjs';
import { EntryManager, ModalRef, ModalService, NotificationService, ReportService } from '@app/core/services';
import { MessageBroker } from 'injection-tokens';
import { CommonModule } from '@angular/common';
import { ReportType } from '@app/core/enums';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-exposed-passwords-dialog',
  templateUrl: './exposed-passwords-dialog.component.html',
  styleUrls: ['./exposed-passwords-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule,
    ModalComponent
  ]
})
export class ExposedPasswordsDialogComponent implements IModal, OnInit {
  ref: ComponentRef<ExposedPasswordsDialogComponent>;
  additionalData?: IAdditionalData;
  result = [];
  exposedPasswordsFound = [];
  scanInProgress: boolean;
  lastReport: any;
  lastReportLoaded = false;
  showDetails = false;
  showError = false;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly modalRef: ModalRef,
    private readonly reportService: ReportService,
    private readonly modalService: ModalService,
    private readonly entryManager: EntryManager,
    private readonly notificationService: NotificationService
  ) { }

  close() {
    this.modalRef.close();
  }

  async scan() {
    this.scanInProgress = true;

    combineLatest([
      from(this.reportService.scanForLeaks()),
      timer(1000).pipe(take(1)),
    ]).subscribe({ next: async ([result]) => {
      if (result.error) {
        this.scanInProgress = false;
        this.showError = true;

        return;
      }

      const reportId = await this.reportService.addReport({
        creationDate: new Date(),
        type: ReportType.ExposedPasswords,
        payload: result.data
      });

      await this.getLastReport();
      this.scanInProgress = false;

      if (this.exposedPasswordsFound.length) {
        this.showDetails = true;
      }
    }, error: () => this.scanInProgress = false });
  }

  async saveReport() {
    await this.messageBroker.ipcRenderer
      .invoke(IpcChannel.SaveExposedPasswordsReport, this.exposedPasswordsFound);
    this.notificationService.add({ type: 'success', alive: 10 * 1000, message: 'Report generated' });
  }

  ngOnInit(): void {
    this.getLastReport();
  }

  openUrl(url: string) {
    this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, url);
  }

  public trackByFn(_: number, item: { id: number }) {
    return item.id;
  }

  async editEntry(id: number) {
    this.modalService.openEditEntryWindow(await this.entryManager.get(id));
  }

  private async getLastReport() {
    const exposedPasswords = await this.reportService.getExposedPasswords();

    if (exposedPasswords) {
      this.lastReport = exposedPasswords.report;
      this.result = exposedPasswords.entries;
      this.exposedPasswordsFound = this.result.filter(x => x.occurrences > 0);
    }

    this.lastReportLoaded = true;
  }
}