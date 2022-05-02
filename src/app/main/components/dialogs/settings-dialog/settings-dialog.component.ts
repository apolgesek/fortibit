/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentRef } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { IAdditionalData, IModal } from '@app/shared';
import { AboutDialogComponent } from '../about-dialog/about-dialog.component';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent implements IModal {
  public readonly ref!: ComponentRef<AboutDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly modalManager: ModalManager,
  ) { }

  close() {
    this.modalManager.close(this.ref);
  }
}
