import { Component, ComponentRef, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { IAdditionalData, IModal, ModalComponent } from '@app/shared';
import { EventType } from '@app/core/enums';
import { ICommunicationService } from '@app/core/models';
import { WorkspaceService, ModalRef } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
  standalone: true,
  imports: [
    AutofocusDirective,
    ModalComponent
  ]
})
export class MasterPasswordDialogComponent implements OnInit, OnDestroy, IModal {
  public onGetSaveStatus: (_: Electron.IpcRendererEvent, { status, message, file }: {status: boolean, message: string, file: unknown}) => void;
  
  public readonly ref!: ComponentRef<MasterPasswordDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly zone: NgZone,
    private readonly workspaceService: WorkspaceService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly modalRef: ModalRef
  ) { 
    this.onGetSaveStatus = (_, { status })  => {
      this.zone.run(() => {
        if (status) {
          if (typeof this.additionalData?.event !== 'undefined' && this.additionalData?.event !== null) {
            this.workspaceService.execute(this.additionalData.event as EventType, this.additionalData.payload);
          }
          
          this.close();
        }
      });
    };
  }

  ngOnInit(): void {
    this.communicationService.ipcRenderer.on(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }

  ngOnDestroy(): void {
    this.communicationService.ipcRenderer.off(IpcChannel.GetSaveStatus, this.onGetSaveStatus);
  }

  close() {
    this.modalRef.close()
  }
}
