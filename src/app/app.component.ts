import { animate, query, style, transition, trigger } from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts, NavigationStart, Router } from '@angular/router';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { fromEvent } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { AppConfig } from '../environments/environment';
import { CommunicationService } from './app.module';
import { EventType } from './core/enums';
import { ICommunicationService } from './core/models';
import { WorkspaceService, AppViewContainer, EntryManager, ModalManager, UiEventService } from './core/services';

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
  selector: 'app-root',
  templateUrl: './app.component.html',
  animations: [
    routeAnimations
  ]
})
export class AppComponent implements OnInit {
  public fontsLoaded = false;
  public isElectron = false;
  public isDatabaseLoaded: boolean;

  @HostListener('document:dragenter', ['$event'])
  private onDragEnter(event: MouseEvent) {
    event.preventDefault();
  }

  constructor(
    @Inject(CommunicationService) public readonly communicationService: ICommunicationService,
    private readonly contexts: ChildrenOutletContexts,
    private readonly router: Router,
    private readonly modalManager: ModalManager,
    private readonly appViewContainer: AppViewContainer,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly uiEventService: UiEventService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    console.log('AppConfig', AppConfig);
    this.isElectron = this.communicationService.getPlatform() != 'web';
    this.appViewContainer.appViewContainerRef = this.viewContainerRef;
  }

  ngOnInit() {
    this.workspaceService.setupDatabase();
    this.closeModalsOnRouteChange();
    this.registerGlobalEvents();

    this.workspaceService.loadedDatabase$.subscribe(() => {
      this.isDatabaseLoaded = true;
    });

    this.preloadFonts().then(() => {
      this.fontsLoaded = true;
    });

    this.communicationService.ipcRenderer.send(IpcChannel.CheckUpdate);
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

  private preloadFonts(): Promise<FontFace[]> {
    const fontsArray = []
    document.fonts.forEach(x => fontsArray.push(x));

    return Promise.all(fontsArray.map(x => x.status === 'unloaded' && x.load()));
  }

  private closeModalsOnRouteChange() {
    this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe(() => {
      this.modalManager.openedModals.forEach(m => this.modalManager.close(m));
    });
  }

  private registerGlobalEvents() {
    this.onDragOverApp();
    this.onFileDrop();
    this.handleEntryDeselection();
    this.handleAppExit();
  }

  private handleAppExit() {
    const productionMode = AppConfig.environment === 'PROD';

    if (productionMode) {
      window.onbeforeunload = (event: Event) => {
        this.workspaceService.checkFileSaved(EventType.Exit);
        event.returnValue = false;
      };
    }
  }

  private handleEntryDeselection() {
    fromEvent(this.document, 'mouseup')
      .pipe(tap((event: MouseEvent) => {
        if (this.isOutsideClick(event) && !this.uiEventService.handles.some(x => x.isDragged)) {
          this.entryManager.selectedPasswords = [];
        }
      })).subscribe();
  }

  private onFileDrop() {
    fromEvent(this.document, 'drop')
      .pipe(tap((event: Event) => {
        const dataTransfer = (event as DragEvent).dataTransfer as DataTransfer;

        if (dataTransfer.files.length) {
          this.workspaceService.checkFileSaved(EventType.DropFile, dataTransfer.files[0].path);
        }

        event.preventDefault();
      })).subscribe();
  }

  private onDragOverApp() {
    fromEvent(this.document, 'dragover')
      .pipe(tap((event: Event) => {
        (event as MouseEvent).preventDefault();
      })).subscribe();
  }

  private isOutsideClick(event: MouseEvent) {
    const targetElement = event.target as Element;

    return !targetElement.closest('[data-prevent-entry-deselect]');
  }
}
