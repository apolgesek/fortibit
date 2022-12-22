import { CommonModule } from '@angular/common';
import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { EventType } from '@app/core/enums';
import { ICommunicationService, IHotkeyHandler } from '@app/core/models';
import { ModalService, WorkspaceService } from '@app/core/services';
import { slideDown } from '@app/shared';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { UpdateState } from '@shared-renderer/update-state.model';
import { CommunicationService, HotkeyHandler } from 'injection-tokens';
import { Observable, scan, startWith, Subject, takeUntil } from 'rxjs';

interface INotification {
  type: 'update';
  content: string;
}

@Component({
  selector: 'app-settings-button',
  templateUrl: './settings-button.component.html',
  styleUrls: ['./settings-button.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective
  ],
  animations: [
    slideDown
  ]
})
export class SettingsButtonComponent implements OnInit {
  public readonly notifications$: Observable<INotification[]>;
  public updateAvailable = '';

  private readonly destroyed = new Subject<void>();
  private readonly notificationsSource = new Subject<INotification>();

  private updateListener: (event: Electron.IpcRendererEvent, state: UpdateState, version: string) => void;

  public get settingsLabel(): string {
    return this.hotkeyHandler.configuration.settingsLabel;
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    @Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler,
    private readonly zone: NgZone,
    private readonly modalService: ModalService,
    private readonly workspaceService: WorkspaceService,
  ) { 
    this.notifications$ = this.notificationsSource.asObservable()
    .pipe(
      scan((acc, n: INotification) => {
        const updateNotificationIndex = acc.findIndex(x => x.type === 'update');

        if (updateNotificationIndex > -1 && n.type === 'update') {
          acc[updateNotificationIndex] = n;
        } else {
          acc.push(n);
        }

        return acc;
      }, [] as INotification[]),
      startWith([]),
      takeUntil(this.destroyed)
    );

    this.updateListener = (_: Electron.IpcRendererEvent, state: UpdateState, version: string) => {
      this.zone.run(() => {
        if (state !== UpdateState.Downloaded) {
          return;
        }
        
        this.updateAvailable = version;
        this.notificationsSource.next({ type: 'update', content: version });
      });
    };

    this.communicationService.ipcRenderer.on(IpcChannel.UpdateState, this.updateListener);
  }

  openSettings() {
    this.modalService.openSettingsWindow();
  }

  updateAndRelaunch() {
    this.workspaceService.checkFileSaved(EventType.Update);
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
