import {
  animate,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts, RouterModule } from '@angular/router';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { MessageBroker } from 'injection-tokens';
import { IMessageBroker } from '../core/models';
import { AppViewContainer, WorkspaceService } from '../core/services';
import { MenuBarComponent } from '../main/components/menu-bar/menu-bar.component';

const ONE_HOUR = 1000 * 60 * 60;

export const routeAnimations = trigger('routeAnimations', [
  transition('* => *', [
    query(
      ':enter',
      [style({ opacity: 0, position: 'relative', width: '100%' })],
      {
        optional: true,
      }
    ),
    query(
      ':leave',
      [
        style({ opacity: 1 }),
        animate(
          100,
          style({ opacity: 0, position: 'relative', width: '100%' })
        ),
      ],
      { optional: true }
    ),
    query(
      ':enter',
      [
        style({ opacity: 0 }),
        animate(
          100,
          style({ opacity: 1, position: 'relative', width: '100%' })
        ),
      ],
      { optional: true }
    ),
  ]),
]);

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  standalone: true,
  imports: [RouterModule, CommonModule, MenuBarComponent],
  animations: [routeAnimations],
})
export class MainComponent implements OnInit {
  public isElectron = false;
  public isDatabaseLoaded: boolean;

  constructor(
		@Inject(MessageBroker)
		public readonly messageBroker: IMessageBroker,
		private readonly contexts: ChildrenOutletContexts,
		private readonly appViewContainer: AppViewContainer,
		private readonly viewContainerRef: ViewContainerRef,
		private readonly workspaceService: WorkspaceService
  ) {
    this.isElectron = this.messageBroker.platform !== 'web';
    this.appViewContainer.appViewContainerRef = this.viewContainerRef;
  }

  ngOnInit() {
    this.workspaceService.loadedDatabase$.subscribe(() => {
      this.isDatabaseLoaded = true;
    });
    this.workspaceService.setupDatabase();
    this.messageBroker.ipcRenderer.send(IpcChannel.CheckUpdate);

    setInterval(() => {
      this.messageBroker.ipcRenderer.send(IpcChannel.CheckUpdate);
    }, ONE_HOUR);
  }

  getRouteState(): string {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.state;
  }
}
