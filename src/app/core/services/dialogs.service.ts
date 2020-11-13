import { Injectable, NgZone } from '@angular/core';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { DialogService, DynamicDialogRef } from 'primeng-lts/dynamicdialog';
import { ElectronService } from './electron/electron.service';

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  openDeleteEntryWindowRef: DynamicDialogRef;
  openDeleteGroupWindowRef: DynamicDialogRef;
  openConfirmExitWindowRef: DynamicDialogRef;
  openEntryWindowRef: DynamicDialogRef;
  openMasterPasswordWindowRef: DynamicDialogRef;

  constructor(
    private zone: NgZone,
    private dialogService: DialogService,
    private electronService: ElectronService,
  ) {
    this.electronService.ipcRenderer.on('openCloseConfirmationWindow', () => {
      this.zone.run(() => {
        this.openConfirmExitWindow();
      });
    });
   }

  openDeleteEntryWindow() {
    this.openDeleteEntryWindowRef = this.dialogService.open(
      DeleteEntryDialogComponent,
      {
        showHeader: false
      }
    );
  }

  openDeleteGroupWindow() {
    this.openDeleteGroupWindowRef = this.dialogService.open(
      DeleteGroupDialogComponent,
      {
        showHeader: false
      }
    );
  }

  openConfirmExitWindow() {
    this.openConfirmExitWindowRef = this.dialogService.open(
      ConfirmExitDialogComponent,
      {
        showHeader: false
      }
    );
  }

  openEntryWindow() {
    this.openEntryWindowRef = this.dialogService.open(
      EntryDialogComponent,
      {
        width: '70%',
        showHeader: false,
      }
    );
  }

  openMasterPasswordWindow() {
    this.openMasterPasswordWindowRef = this.dialogService.open(
      MasterPasswordDialogComponent,
      {
        showHeader: false,
      }
    );
  }
}
