/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentRef } from '@angular/core';
import { ModalRef } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared/models/modal.model';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent implements IModal {
  public readonly ref!: ComponentRef<SettingsDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly modalRef: ModalRef,
  ) { }

  close() {
    this.modalRef.close()
  }
}
