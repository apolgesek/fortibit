import { ComponentRef, Inject, Injectable, NgZone } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { AboutDialogComponent } from '@app/main/components/dialogs/about-dialog/about-dialog.component';
import { ExposedPasswordsDialogComponent } from '@app/main/components/dialogs/exposed-passwords-dialog/exposed-passwords-dialog.component';
import { WeakPasswordsDialogComponent } from '@app/main/components/dialogs/weak-passwords-dialog/weak-passwords-dialog.component';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { EntryHistoryDialogComponent } from '@app/main/components/dialogs/entry-history-dialog/entry-history-dialog.component';
import { GroupDialogComponent } from '@app/main/components/dialogs/group-dialog/group-dialog.component';
import { MoveEntryDialogComponent } from '@app/main/components/dialogs/move-entry-dialog/move-entry-dialog.component';
import { ImportDatabaseMetadataDialogComponent } from '@app/main/components/dialogs/import-database-metadata-dialog/import-database-metadata-dialog.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { SettingsDialogComponent } from '@app/main/components/dialogs/settings-dialog/settings-dialog.component';
import { IHistoryEntry, IpcChannel } from '@shared-renderer/index';
import { CommunicationService } from 'injection-tokens';
import { EventType } from '../enums';
import { ICommunicationService } from '../models';
import { EntryManager } from './managers/entry.manager';

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
    private readonly entryManager: EntryManager,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
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
    this.entryManager.editedEntry = null;
    await this.openEntryWindow();
  }

  async openEditEntryWindow() {
    this.entryManager.editedEntry = this.entryManager.selectedPasswords[0];
    this.openEntryWindow();
  }

  async openHistoryEntryWindow(entry: IHistoryEntry, config?: { readonly: boolean }) {
    this.entryManager.editedEntry = entry.entry;
  
    const decryptedPassword = await this.communicationService.ipcRenderer
      .invoke(IpcChannel.DecryptPassword, this.entryManager.editedEntry.password);

    return this.modalManager.open(EntryDialogComponent, { payload: { decryptedPassword, config, historyEntry: entry }});
  }

  openMasterPasswordWindow(config?: { forceNew?: boolean }) {
    this.modalManager.open(MasterPasswordDialogComponent, { payload: config });
  }

  openGroupWindow(mode: 'new' | 'edit' = 'new') {
    this.modalManager.open(GroupDialogComponent, { payload: { mode } });
  }

  openAboutWindow() {
    this.modalManager.open(AboutDialogComponent);
  }

  openSettingsWindow() {
    this.modalManager.open(SettingsDialogComponent);
  }

  openImportedDbMetadataWindow(metadata: any) {
    this.modalManager.open(ImportDatabaseMetadataDialogComponent, { payload: metadata });
  }

  openExposedPasswordsWindow() {
    this.modalManager.open(ExposedPasswordsDialogComponent);
  }

  openWeakPasswordsWindow() {
    this.modalManager.open(WeakPasswordsDialogComponent);
  }

  openEntryHistoryWindow(id: number) {
    this.entryManager.editedEntry = this.entryManager.selectedPasswords[0];
    this.modalManager.open(EntryHistoryDialogComponent, { payload: { id } });
  }

  openMoveEntryWindow() {
    this.modalManager.open(MoveEntryDialogComponent);
  }

  close<T>(ref: ComponentRef<T>) {
    this.modalManager.close(ref);
  }

  private async openEntryWindow() {
    let decryptedPassword;

    if (this.entryManager.editedEntry) {
      decryptedPassword = await this.communicationService.ipcRenderer
        .invoke(IpcChannel.DecryptPassword, this.entryManager.editedEntry.password);
    }

    this.modalManager.open(EntryDialogComponent, { payload: { decryptedPassword } });
  }
}

