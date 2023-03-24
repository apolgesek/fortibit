import { Component, ComponentRef, Inject } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { combineLatest, from, take, timer } from 'rxjs';
import { ModalRef, ModalService, NotificationService, ReportService, WorkspaceService } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';
import { CommonModule } from '@angular/common';
import { ReportType } from '@app/core/enums';
import { FeatherModule } from 'angular-feather';
import { EntryRepository } from '@app/core/repositories';

@Component({
  selector: 'app-exposed-passwords-dialog',
  templateUrl: './exposed-passwords-dialog.component.html',
  styleUrls: ['./exposed-passwords-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule,
    AutofocusDirective,
    ModalComponent
  ]
})
export class ExposedPasswordsDialogComponent implements IModal {
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
    private readonly modalRef: ModalRef,
    private readonly reportService: ReportService,
    private readonly workspaceService: WorkspaceService,
    private readonly notificationService: NotificationService,
    private readonly modalService: ModalService,
    private readonly entryRepository: EntryRepository,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService
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
      
      this.workspaceService.isSynced = null;
      this.notificationService.add({ type: 'success', alive: 5000, message: 'New report generated' });
      await this.getLastReport();
      this.scanInProgress = false;
      
      if (this.exposedPasswordsFound.length) {
        this.showDetails = true;
      }
    }, error: () => this.scanInProgress = false });
  }

  ngOnInit(): void {
    this.getLastReport();
  }

  openUrl(url: string) {
    this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, url);
  }

  async editEntry(id: number) {
    this.modalService.openEditEntryWindow(await this.entryRepository.get(id));
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
