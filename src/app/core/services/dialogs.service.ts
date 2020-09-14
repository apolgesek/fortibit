import { Injectable, NgZone } from '@angular/core';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ElectronService } from './electron/electron.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  constructor(
    private zone: NgZone,
    private dialogService: DialogService,
    private electronService: ElectronService,
    private storageService: StorageService
  ) {
    this.electronService.ipcRenderer.on('openCloseConfirmationWindow', () => {
      this.zone.run(() => {
        this.openConfirmExitWindow();
      });
    });
   }

  openDeleteEntryWindow() {
    this.dialogService.open(
      DeleteEntryDialogComponent,
      {
        header: 'Delete entry'
      }
    );
  }

  openDeleteGroupWindow() {
    this.dialogService.open(
      DeleteGroupDialogComponent,
      {
        header: 'Delete group'
      }
    );
  }

  openConfirmExitWindow() {
    this.dialogService.open(
      ConfirmExitDialogComponent,
      {
        header: 'Quit haslock'
      }
    );
  }

  openEntryWindow() {
    this.dialogService.open(
      EntryDialogComponent,
      {
        header: this.storageService.editedEntry ? 'Edit entry' : 'New entry',
        width: '70%'
      }
    );
  }

  openMasterPasswordWindow() {
    this.dialogService.open(
      MasterPasswordDialogComponent,
      {
        header: 'Master password'
      }
    );
  }
}
