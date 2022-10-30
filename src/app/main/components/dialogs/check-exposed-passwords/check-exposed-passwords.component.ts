import { Component, ComponentRef, Inject } from '@angular/core';
import { ICommunicationService } from '@app/core/models';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { combineLatest, finalize, from, take, timer } from 'rxjs';
import { ModalRef, ReportService, WorkspaceService } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-check-exposed-passwords',
  templateUrl: './check-exposed-passwords.component.html',
  styleUrls: ['./check-exposed-passwords.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AutofocusDirective,
    ModalComponent
  ]
})
export class CheckExposedPasswordsComponent implements IModal {
  ref: ComponentRef<CheckExposedPasswordsComponent>;
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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService
  ) { }

  close() {
    this.modalRef.close();
  }

  async scan() {
    this.scanInProgress = true;
    const t0 = performance.now();

    combineLatest([
      from(this.reportService.scanForLeaks()),
      timer(1000).pipe(take(1)),
    ]).pipe(finalize(() => {
      this.scanInProgress = false;
    })).subscribe(async ([result]) => {
      if (result.error) {
        this.scanInProgress = false;
        this.showError = true;

        return;
      }

      const t1 = performance.now();

      const reportId = await this.reportService.addReport({
        creationDate: new Date(),
        generationTime: t1 - t0,
        type: 1,
        payload: result.data
      });
      
      this.workspaceService.dateSaved = null;
      this.scanInProgress = false;
      await this.getLastReport();
      
      if (this.exposedPasswordsFound.length) {
        this.showDetails = true;
      }
    });
  }

  ngOnInit(): void {
    this.getLastReport();
  }

  openUrl(url: string) {
    this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, url);
  }

  private async getLastReport() {
    const exposedPasswords = await this.reportService.getExposedPasswords();

    if (exposedPasswords) {
      this.lastReport = exposedPasswords.report;
      this.lastReport.generationTime = Math.round(this.lastReport.generationTime / 1000 * 100) / 100;

      this.result = exposedPasswords.entries;
      this.exposedPasswordsFound = this.result.filter(x => x.occurrences > 0);
    }

    this.lastReportLoaded = true;
  }
}
