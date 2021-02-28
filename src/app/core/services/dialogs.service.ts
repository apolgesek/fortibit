import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone, Type } from '@angular/core';
import { ConfirmExitDialogComponent } from '@app/main/components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from '@app/main/components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from '@app/main/components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from '@app/main/components/dialogs/master-password-dialog/master-password-dialog.component';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng-lts/dynamicdialog';
import { EventType } from '../enums';
import { ElectronService } from './electron/electron.service';

enum Dialog {
  OpenDeleteEntry,
  OpenDeleteGroup,
  OpenConfirmExit,
  OpenEntry,
  OpenMasterPassword
}

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  private dialogRefs = new Map<Dialog, DynamicDialogRef>();

  get isAnyDialogOpened(): boolean {
    return this.dialogRefs.size > 0;
  }

  constructor(
    private zone: NgZone,
    private dialogService: DialogService,
    private electronService: ElectronService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  init() {
    this.electronService.ipcRenderer.on(
      'openCloseConfirmationWindow',
      (_, event: EventType, payload: unknown) => {
        this.zone.run(() => {
          this.openConfirmExitWindow(event, payload);
        });
      }
    );
  }

  openDeleteEntryWindow() {
    this.openDialog(
      DeleteEntryDialogComponent,
      {
        showHeader: false,
        transitionOptions: '0ms'
      },
      Dialog.OpenDeleteEntry
    );
  }

  openDeleteGroupWindow() {
    this.openDialog(
      DeleteGroupDialogComponent,
      {
        showHeader: false,
        transitionOptions: '0ms'
      },
      Dialog.OpenDeleteGroup
    );
  }

  openConfirmExitWindow(event: EventType, payload: unknown) {
    this.openDialog(
      ConfirmExitDialogComponent,
      {
        showHeader: false,
        transitionOptions: '0ms',
        data: {
          event,
          payload
        }
      },
      Dialog.OpenConfirmExit
    );
  }

  openEntryWindow() {
    this.openDialog(
      EntryDialogComponent,
      {
        width: '70%',
        showHeader: false,
        transitionOptions: '0ms',
      },
      Dialog.OpenEntry
    );
  }

  openMasterPasswordWindow() {
    this.openDialog(
      MasterPasswordDialogComponent,
      {
        showHeader: false,
        transitionOptions: '0ms'
      },
      Dialog.OpenMasterPassword
    );
  }

  private openDialog(component: Type<unknown>, config: DynamicDialogConfig, type: Dialog) {
    const ref = this.dialogService.open(component, config);

    ref.onClose.subscribe(() => {
      this.dialogRefs.delete(type);
    });

    this.dialogRefs.set(type, ref);

    requestAnimationFrame(() => {
      this.document.querySelector('.p-dialog-mask').setAttribute('data-prevent-entry-deselect', '');
    });
  }
}
