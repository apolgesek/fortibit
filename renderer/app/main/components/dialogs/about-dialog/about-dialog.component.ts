import { CommonModule } from '@angular/common';
import { Component, ComponentRef, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { ModalRef, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { IAdditionalData, IModal } from '@app/shared';
import { IpcChannel } from '../../../../../../shared/ipc-channel.enum';
import { UpdateState } from '../../../../../../shared/update-state.model';
import { MessageBroker } from 'injection-tokens';
import { take } from 'rxjs';
import { IAppConfig } from '../../../../../../app-config';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-about-dialog',
  templateUrl: './about-dialog.component.html',
  styleUrls: ['./about-dialog.component.scss'],
  standalone: true,
  imports: [
    ModalComponent,
    CommonModule
  ]
})
export class AboutDialogComponent implements IModal, OnInit, OnDestroy {
  public readonly ref!: ComponentRef<AboutDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly updateState = UpdateState;
  public config: IAppConfig;
  public state: UpdateState;
  public version: string;
  public progress = '0';

  private updateStateListener: (event: any, state: UpdateState, version: string) => void;
  private updateProgressListener: (event: any, progress: string) => void;

  constructor(
    private readonly configService: ConfigService,
    private readonly modalRef: ModalRef,
    private readonly zone: NgZone,
    private readonly workspaceService: WorkspaceService,
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
  ) {}

  ngOnInit() {
    this.updateStateListener = (_: any, state: UpdateState, version: string) => {
      this.zone.run(() => {
        console.log(state);
        this.state = state;
        this.version = version;
      });
    };

    this.updateProgressListener = (_: any, progress: string) => {
      this.zone.run(() => {
        this.progress = progress;
      });
    };

    this.messageBroker.ipcRenderer.on(IpcChannel.UpdateState, this.updateStateListener);
    this.messageBroker.ipcRenderer.on(IpcChannel.UpdateProgress, this.updateProgressListener);
    this.messageBroker.ipcRenderer.send(IpcChannel.GetUpdateState);
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config as IAppConfig;
    });
  }

  ngOnDestroy(): void {
    this.messageBroker.ipcRenderer.off(IpcChannel.UpdateState, this.updateStateListener);
    this.messageBroker.ipcRenderer.off(IpcChannel.UpdateProgress, this.updateProgressListener);
  } 
  
  async updateAndRelaunch() {
    const success = await this.workspaceService.executeEvent();
    if (success) {
      this.messageBroker.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
    }
  }

  close() {
    this.modalRef.close();
  }
}
