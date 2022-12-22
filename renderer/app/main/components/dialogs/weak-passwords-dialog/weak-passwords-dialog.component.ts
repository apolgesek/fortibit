import { Component, ComponentRef, Inject } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { combineLatest, from, take, timer } from 'rxjs';
import { ModalRef, NotificationService, ReportService, WorkspaceService } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';
import { CommonModule } from '@angular/common';
import { ReportType } from '@app/core/enums';

@Component({
  selector: 'app-weak-passwords-dialog',
  templateUrl: './weak-passwords-dialog.component.html',
  styleUrls: ['./weak-passwords-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AutofocusDirective,
    ModalComponent
  ]
})
export class WeakPasswordsDialogComponent implements IModal {
  ref: ComponentRef<WeakPasswordsDialogComponent>;
  additionalData?: IAdditionalData;
  result = [];
  weakPasswordsFound = [];
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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService
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
      
      this.workspaceService.isSynced = null;
      this.notificationService.add({ type: 'success', alive: 5000, message: 'New report generated' });
      await this.getLastReport();
      this.scanInProgress = false;
      
      if (this.weakPasswordsFound.length) {
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
