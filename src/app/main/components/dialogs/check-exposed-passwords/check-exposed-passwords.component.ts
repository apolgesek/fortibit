import { Component, ComponentRef } from '@angular/core';
import { ElectronService } from '@app/core/services';
import { ModalManager } from '@app/core/services/modal-manager';
import { StorageService } from '@app/core/services/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { combineLatest, from, take, timer } from 'rxjs';

@Component({
  selector: 'app-check-exposed-passwords',
  templateUrl: './check-exposed-passwords.component.html',
  styleUrls: ['./check-exposed-passwords.component.scss']
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
  
  constructor(
    private readonly modalManager: ModalManager,
    private readonly storageService: StorageService,
    private readonly electronService: ElectronService
  ) { }

  close() {
    this.modalManager.close(this.ref);
  }

  async scan() {
    this.scanInProgress = true;
    const t0 = performance.now();

    combineLatest([
      from(this.storageService.scanLeaks()),
      timer(1000).pipe(take(1))
    ]).subscribe(async ([result]) => {
      const t1 = performance.now();

      const reportId = await this.storageService.addReport({
        creationDate: new Date(),
        generationTime: t1 - t0,
        type: 1,
        payload: result.data
      });
      
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
    this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, url);
  }

  private async getLastReport() {
    const exposedPasswords = await this.storageService.getExposedPasswords();

    if (exposedPasswords) {
      this.lastReport = exposedPasswords.report;
      this.lastReport.generationTime = Math.round(this.lastReport.generationTime / 1000 * 100) / 100;

      this.result = exposedPasswords.entries;
      this.exposedPasswordsFound = this.result.filter(x => x.occurrences > 0);
    }

    this.lastReportLoaded = true;
  }
}
