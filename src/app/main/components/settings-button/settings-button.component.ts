import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ModalService } from '@app/core/services';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { UpdateState } from '@shared-renderer/update-state.model';
import { Observable, scan, startWith, Subject, takeUntil } from 'rxjs';

interface INotification {
  type: 'update';
  content: string;
}

@Component({
  selector: 'app-settings-button',
  templateUrl: './settings-button.component.html',
  styleUrls: ['./settings-button.component.scss']
})
export class SettingsButtonComponent implements OnInit {
  public readonly notifications$: Observable<INotification[]>;
  public updateAvailable = '';

  private readonly destroyed = new Subject<void>();
  private readonly notificationsSource = new Subject<INotification>();

  private updateListener: (event: Electron.IpcRendererEvent, state: UpdateState, version: string) => void;

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly zone: NgZone,
    private readonly modalService: ModalService
  ) { 
    this.notifications$ = this.notificationsSource.asObservable()
    .pipe(
      scan((a, c: INotification) => ([...a, c]), [] as INotification[]),
      startWith([]),
      takeUntil(this.destroyed)
    );

    this.updateListener = (_: Electron.IpcRendererEvent, state: UpdateState, version: string) => {
      this.zone.run(() => {
        if (state === UpdateState.Downloaded) {
          this.updateAvailable = version;
          this.notificationsSource.next({ type: 'update', content: version });
        }
      });
    };

    this.communicationService.ipcRenderer.on(IpcChannel.UpdateState, this.updateListener);
  }

  openSettings() {
    this.modalService.openSettingsWindow();
  }

  updateAndRelaunch() {
    this.communicationService.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
  }

  ngOnInit(): void {
    this.communicationService.ipcRenderer.send(IpcChannel.GetUpdateState);
  }

  ngOnDestroy() {
    this.communicationService.ipcRenderer.off(IpcChannel.UpdateState, this.updateListener);

    this.destroyed.next();
    this.destroyed.complete();
  }

}
