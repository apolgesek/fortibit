import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IMessageBroker, IHotkeyHandler } from '@app/core/models';
import { ModalService, WorkspaceService } from '@app/core/services';
import { slideDown } from '@app/shared';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { UpdateState } from '@shared-renderer/update-state.model';
import { FeatherModule } from 'angular-feather';
import { MessageBroker, HotkeyHandler } from 'injection-tokens';
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
    FeatherModule,
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective,
    TooltipDirective
  ],
  animations: [
    slideDown
  ]
})
export class SettingsButtonComponent implements OnInit, OnDestroy {
  public readonly notifications$: Observable<INotification[]>;
  public updateAvailable = '';
  private readonly notificationsSource = new Subject<INotification>();
  private updateListener: (event: any, state: UpdateState, version: string) => void;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    @Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler,
    private readonly destroyRef: DestroyRef,
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
        takeUntilDestroyed(this.destroyRef)
      );

    this.updateListener = (_: any, state: UpdateState, version: string) => {
      this.zone.run(() => {
        if (state !== UpdateState.Downloaded) {
          return;
        }

        this.updateAvailable = version;
        this.notificationsSource.next({ type: 'update', content: version });
      });
    };

    this.messageBroker.ipcRenderer.on(IpcChannel.UpdateState, this.updateListener);
  }

  public get settingsLabel(): string {
    return this.hotkeyHandler.configuration.settingsLabel;
  }

  openSettings() {
    this.modalService.openSettingsWindow();
  }

  async updateAndRelaunch() {
    const success = await this.workspaceService.executeEvent();
    if (success) {
      this.messageBroker.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
    }
  }

  ngOnInit(): void {
    this.messageBroker.ipcRenderer.send(IpcChannel.GetUpdateState);
  }

  ngOnDestroy() {
    this.messageBroker.ipcRenderer.off(IpcChannel.UpdateState, this.updateListener);
  }
}