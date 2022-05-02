import { Component, ComponentRef, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { IpcChannel } from '@shared-renderer/index';
import { IAdditionalData, IModal } from '@app/shared';
import { EventType } from '@app/core/enums';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
})
export class MasterPasswordDialogComponent implements OnInit, OnDestroy, IModal {
  public onGetSaveStatus: (_: Electron.IpcRendererEvent, { status, message, file }: {status: boolean, message: string, file: unknown}) => void;
  
  public readonly ref!: ComponentRef<MasterPasswordDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly zone: NgZone,
    private readonly storageService: StorageService,
    private readonly electronService: ElectronService,
    private readonly modalManager: ModalManager
  ) { 
    this.onGetSaveStatus = (_, { status })  => {
      this.zone.run(() => {
        if (status) {
          if (typeof this.additionalData?.event !== 'undefined' && this.additionalData?.event !== null) {
            this.storageService.execute(this.additionalData.event as EventType, this.additionalData.payload);
          }
          
          this.close();
        }
      });
    };
  }

  ngOnInit(): void {
    this.electronService.ipcRenderer.on(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }

  ngOnDestroy(): void {
    this.electronService.ipcRenderer.off(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }

  close() {
    this.modalManager.close(this.ref);
  }
}
