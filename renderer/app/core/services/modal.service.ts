import { ComponentRef, Inject, Injectable } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { AboutDialogComponent } from '@app/main/components/dialogs/about-dialog/about-dialog.component';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { EntryHistoryDialogComponent } from '@app/main/components/dialogs/entry-history-dialog/entry-history-dialog.component';
import { ExposedPasswordsDialogComponent } from '@app/main/components/dialogs/exposed-passwords-dialog/exposed-passwords-dialog.component';
import { FileRecoveryDialogComponent } from '@app/main/components/dialogs/file-recovery-dialog/file-recovery-dialog.component';
import { GeneratorDialogComponent } from '@app/main/components/dialogs/generator-dialog/generator-dialog.component';
import { GroupDialogComponent } from '@app/main/components/dialogs/group-dialog/group-dialog.component';
import { ImportDatabaseMetadataDialogComponent } from '@app/main/components/dialogs/import-database-metadata-dialog/import-database-metadata-dialog.component';
import { MaintenanceDialogComponent } from '@app/main/components/dialogs/maintenance-dialog/maintenance-dialog.component';
import { MoveEntryDialogComponent } from '@app/main/components/dialogs/move-entry-dialog/move-entry-dialog.component';
import { PasswordChangeDialogComponent } from '@app/main/components/dialogs/password-change-dialog/password-change-dialog.component';
import { SettingsDialogComponent } from '@app/main/components/dialogs/settings-dialog/settings-dialog.component';
import { WeakPasswordsDialogComponent } from '@app/main/components/dialogs/weak-passwords-dialog/weak-passwords-dialog.component';
import { MessageBroker } from 'injection-tokens';
import { IHistoryEntry, IPasswordEntry, IpcChannel } from '../../../../shared/index';
import { IMessageBroker } from '../models';
import { EntryManager } from './managers/entry.manager';
import { ModalRef } from './modal-ref';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  constructor(
    private readonly modalManager: ModalManager,
    private readonly entryManager: EntryManager,
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
  ) {}

  public get isAnyModalOpen(): boolean {
    return this.modalManager.isAnyModalOpen;
  }

  openDeleteEntryWindow(): ModalRef {
    return this.modalManager.open(DeleteEntryDialogComponent);
  }

  openDeleteGroupWindow(): ModalRef {
    return this.modalManager.open(DeleteGroupDialogComponent);
  }

  async openConfirmExitWindow(): Promise<boolean> {
    return this.modalManager.openPrompt(ConfirmExitDialogComponent);
  }

  async openNewEntryWindow(): Promise<ModalRef> {
    this.entryManager.editedEntry = null;
    return this.openEntryWindow();
  }

  async openEditEntryWindow(entry?: IPasswordEntry): Promise<ModalRef> {
    this.entryManager.editedEntry = entry ?? this.entryManager.selectedPasswords[0];
    return this.openEntryWindow();
  }

  async openHistoryEntryWindow(entry: IHistoryEntry, config?: { readonly: boolean }): Promise<ModalRef> {
    this.entryManager.editedEntry = entry.entry;

    const decryptedPassword = await this.messageBroker.ipcRenderer
      .invoke(IpcChannel.DecryptPassword, this.entryManager.editedEntry.password);

    return this.modalManager.open(EntryDialogComponent, { payload: { decryptedPassword, config, historyEntry: entry }});
  }

  openGroupWindow(mode: 'new' | 'edit' = 'new'): ModalRef {
    return this.modalManager.open(GroupDialogComponent, { payload: { mode } });
  }

  openAboutWindow(): ModalRef {
    return this.modalManager.open(AboutDialogComponent);
  }

  openSettingsWindow(): ModalRef {
    return this.modalManager.open(SettingsDialogComponent);
  }

  openImportedDbMetadataWindow<T>(metadata: T): ModalRef {
    return this.modalManager.open(ImportDatabaseMetadataDialogComponent, { payload: metadata });
  }

  openExposedPasswordsWindow(): ModalRef {
    return this.modalManager.open(ExposedPasswordsDialogComponent);
  }

  openWeakPasswordsWindow(): ModalRef {
    return this.modalManager.open(WeakPasswordsDialogComponent);
  }

  openEntryHistoryWindow(id: number): ModalRef {
    this.entryManager.editedEntry = this.entryManager.selectedPasswords[0];
    return this.modalManager.open(EntryHistoryDialogComponent, { payload: { id } });
  }

  openMoveEntryWindow(): ModalRef {
    return this.modalManager.open(MoveEntryDialogComponent);
  }

  openRecoveryWindow(path: string): ModalRef {
    return this.modalManager.open(FileRecoveryDialogComponent, { payload: { path } });
  }

  openPasswordChangeWindow(): ModalRef {
    return this.modalManager.open(PasswordChangeDialogComponent);
  }

  openMaintenanceWindow(): ModalRef {
    return this.modalManager.open(MaintenanceDialogComponent);
  }

  openGeneratorWindow(): ModalRef {
    return this.modalManager.open(GeneratorDialogComponent);
  }

  close<T>(ref: ComponentRef<T>) {
    this.modalManager.close(ref);
  }

  private async openEntryWindow(): Promise<ModalRef> {
    let decryptedPassword;

    if (this.entryManager.editedEntry) {
      decryptedPassword = await this.messageBroker.ipcRenderer
        .invoke(IpcChannel.DecryptPassword, this.entryManager.editedEntry.password);
    }

    return this.modalManager.open(EntryDialogComponent, { payload: { decryptedPassword } });
  }
}

