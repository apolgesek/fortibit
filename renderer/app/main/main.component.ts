import { animate, query, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts, RouterModule } from '@angular/router';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { CommunicationService } from 'injection-tokens';
import { ICommunicationService } from '../core/models';
import { AppViewContainer, WorkspaceService } from '../core/services';
import { MenuBarComponent } from '../main/components/menu-bar/menu-bar.component';

const ONE_HOUR = 1000 * 60 * 60;

export const routeAnimations = trigger("routeAnimations", [
	transition("masterPasswordPage => workspacePage", [
		query(":enter", [
      style({
        opacity: 0,
        position: 'absolute',
        width: '100%',
        height: '100%'
      })],
      { optional: true }),

		query(
			":leave",
			[style({
        opacity: 1,
        position: 'absolute',
        width: '100%',
        height: '100%'
      }),
      animate("100ms", style({ opacity: 0 }))],
			{ optional: true }
		),
		query(
			":enter",
			[style({
        opacity: 0,
        position: 'absolute',
        width: '100%',
        height: '100%'
      }),
      animate("100ms", style({ opacity: 1 }))],
			{ optional: true }
		),
	]),
]);

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    MenuBarComponent
  ],
  animations: [
    routeAnimations
  ]
})
export class MainComponent implements OnInit {
  public isElectron = false;
  public isDatabaseLoaded: boolean;

  constructor(
    @Inject(CommunicationService) public readonly communicationService: ICommunicationService,
    private readonly contexts: ChildrenOutletContexts,
    private readonly appViewContainer: AppViewContainer,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly workspaceService: WorkspaceService,
  ) {
    this.isElectron = this.communicationService.platform != 'web';
    this.appViewContainer.appViewContainerRef = this.viewContainerRef;
  }

  ngOnInit() {
    this.workspaceService.loadedDatabase$.subscribe(() => {
      this.isDatabaseLoaded = true;
    });
    this.workspaceService.setupDatabase();
    this.communicationService.ipcRenderer.send(IpcChannel.CheckUpdate);
    
    setInterval(() => {
      this.communicationService.ipcRenderer.send(IpcChannel.CheckUpdate);
    }, ONE_HOUR);
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

}