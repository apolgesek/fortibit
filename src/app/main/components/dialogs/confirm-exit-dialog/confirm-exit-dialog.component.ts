import { Component } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { CoreService } from '@app/core/services/core.service';
import { DynamicDialogRef, DialogService } from 'primeng-lts/dynamicdialog';
import { MasterPasswordDialogComponent } from '../master-password-dialog/master-password-dialog.component';
import { take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss']
})
export class ConfirmExitDialogComponent {
  public buttonsDisabled = false;
  public masterRef: DynamicDialogRef;

  constructor(
    private coreService: CoreService,
    private storageService: StorageService,
    private ref: DynamicDialogRef,
    private dialogService: DialogService
  ) { }

  saveChanges() {
    if (!this.storageService.file) {
      this.buttonsDisabled = true;
      this.masterRef = this.dialogService.open(MasterPasswordDialogComponent, { showHeader: false });
      this.masterRef.onClose.pipe(take(1), tap(() => this.buttonsDisabled = false)).subscribe();
    } else {
      this.storageService.saveDatabase(null);
      this.close();
    }
  }

  exitApp() {
    this.coreService.exitApp();
  }

  close() {
    this.ref.close();
  }
}
