import { Injectable, NgZone } from '@angular/core';
import { AboutDialogComponent } from '@app/main/components/dialogs/about-dialog/about-dialog.component';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { ImportDatabaseMetadataComponent } from '@app/main/components/dialogs/import-database-metadata/import-database-metadata.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { SettingsDialogComponent } from '@app/main/components/dialogs/settings-dialog/settings-dialog.component';
import { IpcChannel } from '@shared-renderer/index';
import { EventType } from '../enums';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { ModalManager } from '@app/core/services/modal-manager';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  public get isAnyModalOpen(): boolean {
    return this.modalManager.isAnyModalOpen;
  }

  constructor(
    private readonly zone: NgZone,
    private readonly modalManager: ModalManager,
    private readonly electronService: ElectronService,
    private readonly storageService: StorageService,
  ) {
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
    this.modalManager.open(DeleteEntryDialogComponent);
  }

  openDeleteGroupWindow() {
    this.modalManager.open(DeleteGroupDialogComponent);
  }

  openConfirmExitWindow(event: EventType, payload: unknown) {
    this.modalManager.open(ConfirmExitDialogComponent, { event, payload });
  }

  async openEntryWindow() {
    let decryptedPassword;
    if (this.storageService.editedEntry) {
      decryptedPassword = await this.electronService.ipcRenderer
        .invoke(IpcChannel.DecryptPassword, this.storageService.editedEntry.password);
    }

    this.modalManager.open(EntryDialogComponent, { payload: decryptedPassword });
  }

  openMasterPasswordWindow(config?: { forceNew: boolean }) {
    this.modalManager.open(MasterPasswordDialogComponent, { payload: config });
  }

  openAboutWindow() {
    this.modalManager.open(AboutDialogComponent);
  }

  openSettingsWindow() {
    this.modalManager.open(SettingsDialogComponent);
  }

  openImportedDbMetadataWindow(metadata: any) {
    this.modalManager.open(ImportDatabaseMetadataComponent, { payload: metadata });
  }
}

