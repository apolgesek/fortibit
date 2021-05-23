import { Injectable, NgZone } from '@angular/core';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { IpcChannel } from '@shared-models/*';
import { EventType } from '../enums';
import { ElectronService } from './electron/electron.service';
import { ModalService } from './modal.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  get isAnyDialogOpened(): boolean {
    return this.modalService.openedModals.length > 0;
  }

  constructor(
    private zone: NgZone,
    private modalService: ModalService,
    private electronService: ElectronService,
    private storageService: StorageService,
  ) { }

  init() {
    this.electronService.ipcRenderer.on(
      IpcChannel.OpenCloseConfirmationWindow,
      (_, event: EventType, payload: unknown) => {
        this.zone.run(() => {
          this.openConfirmExitWindow(event, payload);
        });
      }
    );
  }

  openDeleteEntryWindow() {
    this.modalService.open(DeleteEntryDialogComponent);
  }

  openDeleteGroupWindow() {
    this.modalService.open(DeleteGroupDialogComponent);
  }

  openConfirmExitWindow(event: EventType, payload: unknown) {
    this.modalService.open(ConfirmExitDialogComponent, { event, payload });
  }

  async openEntryWindow() {
    let decryptedPassword;
    if (this.storageService.editedEntry) {
      decryptedPassword = await this.electronService.ipcRenderer
        .invoke(IpcChannel.DecryptPassword, this.storageService.editedEntry.password);
    }

    this.modalService.open(EntryDialogComponent, { payload: decryptedPassword });
  }

  openMasterPasswordWindow() {
    this.modalService.open(MasterPasswordDialogComponent);
  }
}
