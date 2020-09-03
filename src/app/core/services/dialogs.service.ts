import { Injectable } from '@angular/core';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  constructor(
    public dialogService: DialogService,
    private databaseService: DatabaseService
  ) { }

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
        header: this.databaseService.editedEntry ? 'Edit entry' : 'New entry',
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
