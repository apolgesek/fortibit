import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogRef, DialogService, DynamicDialogConfig } from 'primeng-lts/dynamicdialog';
import { MasterPasswordDialogComponent } from '../master-password-dialog/master-password-dialog.component';
import { take, tap } from 'rxjs/operators';
import { CoreService } from '@app/core/services/core.service';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmExitDialogComponent {
  public buttonsDisabled = false;
  public masterRef: DynamicDialogRef;

  constructor(
    private storageService: StorageService,
    private ref: DynamicDialogRef,
    private dialogService: DialogService,
    private config: DynamicDialogConfig,
    private coreService: CoreService
  ) { }

  saveChanges() {
    if (!this.storageService.file) {
      this.buttonsDisabled = true;
      this.masterRef = this.dialogService.open(
        MasterPasswordDialogComponent,
        { showHeader: false, data: this.config.data}
      );
      this.masterRef.onClose.pipe(
        take(1),
        tap(() => {
          this.buttonsDisabled = false;
          this.close();
        })
      ).subscribe();
    } else {
      this.storageService.saveDatabase(null);
      this.close();

      this.coreService.execute(this.config.data.event, this.config.data.payload);
    }
  }

  executeTask() {
    this.close();
    this.coreService.execute(this.config.data.event, this.config.data.payload);
  }

  close() {
    this.ref.close();
  }
}
