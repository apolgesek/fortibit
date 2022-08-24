import { ComponentRef, Inject, Injectable, NgZone } from '@angular/core';
import { CommunicationService } from '@app/app.module';
import { ModalManager } from '@app/core/services/modal-manager';
import { AboutDialogComponent } from '@app/main/components/dialogs/about-dialog/about-dialog.component';
import { CheckExposedPasswordsComponent } from '@app/main/components/dialogs/check-exposed-passwords/check-exposed-passwords.component';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { EntryHistoryComponent } from '@app/main/components/dialogs/entry-history/entry-history.component';
import { ImportDatabaseMetadataComponent } from '@app/main/components/dialogs/import-database-metadata/import-database-metadata.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { SettingsDialogComponent } from '@app/main/components/dialogs/settings-dialog/settings-dialog.component';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { EventType } from '../enums';
import { ICommunicationService } from '../models';
import { StorageService } from './managers/storage.service';

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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly storageService: StorageService,
  ) {
    this.communicationService.ipcRenderer.on(
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

  async openNewEntryWindow() {
    this.storageService.editedEntry = null;
    await this.openEntryWindow();
  }

  async openEditEntryWindow() {
    this.storageService.editedEntry = this.storageService.selectedPasswords[0];
    this.openEntryWindow();
  }

  async openHistoryEntryWindow(entry: IPasswordEntry, config?: { readonly: boolean }) {
    this.storageService.editedEntry = entry;
  
    const decryptedPassword = await this.communicationService.ipcRenderer
      .invoke(IpcChannel.DecryptPassword, this.storageService.editedEntry.password);

    this.modalManager.open(EntryDialogComponent, { payload: { decryptedPassword, config }});
  }

  openMasterPasswordWindow(config?: { forceNew?: boolean }) {
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

  openExposedPasswordsWindow() {
    this.modalManager.open(CheckExposedPasswordsComponent);
  }

  openEntryHistoryWindow(id: number) {
    this.storageService.editedEntry = this.storageService.selectedPasswords[0];
    this.modalManager.open(EntryHistoryComponent, { payload: { id } });
  }

  close<T>(ref: ComponentRef<T>) {
    this.modalManager.close(ref);
  }

  private async openEntryWindow() {
    let decryptedPassword;

    if (this.storageService.editedEntry) {
      decryptedPassword = await this.communicationService.ipcRenderer
        .invoke(IpcChannel.DecryptPassword, this.storageService.editedEntry.password);
    }

    this.modalManager.open(EntryDialogComponent, { payload: { decryptedPassword } });
  }
}

