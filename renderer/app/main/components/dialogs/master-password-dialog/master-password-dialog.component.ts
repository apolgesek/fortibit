import { Component, ComponentRef, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { ICommunicationService } from '@app/core/models';
import { ModalRef } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { CommunicationService } from 'injection-tokens';
import { MasterPasswordSetupComponent } from '../../master-password-setup/master-password-setup.component';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.scss'],
  standalone: true,
  imports: [
    MasterPasswordSetupComponent,
    AutofocusDirective,
    ModalComponent
  ]
})
export class MasterPasswordDialogComponent implements OnInit, OnDestroy, IModal {
  public onGetSaveStatus: (_: any, { status, message, file }: {status: boolean, message: string, file: unknown}) => void;
  
  public readonly ref!: ComponentRef<MasterPasswordDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  constructor(
    private readonly zone: NgZone,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly modalRef: ModalRef
  ) { 
    this.onGetSaveStatus = (_, { status })  => {
      this.zone.run(() => {
        if (status) {
          this.modalRef.onActionResult.next(true);          
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
