import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit, ViewContainerRef } from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { CommunicationService } from 'injection-tokens';
import { filter, fromEvent, take, tap } from 'rxjs';
import { IAppConfig } from '../../app-config';
import { AppConfig } from '../environments/environment';
import { ICommunicationService } from './core/models';
import { AppViewContainer, ComponentGridService, ConfigService, EntryManager, ModalManager, WorkspaceService } from './core/services';
import { MenuBarComponent } from './main/components/menu-bar/menu-bar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    MenuBarComponent
  ]
})
export class AppComponent implements OnInit {
  public fontsLoaded = false;
  private config: IAppConfig;

  @HostListener('document:dragenter', ['$event'])
  private onDragEnter(event: MouseEvent) {
    event.preventDefault();
  }

  constructor(
    @Inject(CommunicationService) public readonly communicationService: ICommunicationService,
    private readonly router: Router,
    private readonly configService: ConfigService,
    private readonly modalManager: ModalManager,
    private readonly appViewContainer: AppViewContainer,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly userInterfaceService: ComponentGridService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.appViewContainer.appViewContainerRef = this.viewContainerRef;
  }
  ngOnInit(): void {
    this.closeModalsOnRouteChange();

    this.preloadFonts().then(() => {
      this.fontsLoaded = true;
    });

    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config;
      this.registerGlobalEvents();
    });
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
      window.onbeforeunload = async (event: Event) => {
        event.returnValue = false;
        const exit = await this.workspaceService.executeEvent();
        if (exit) {
          this.workspaceService.exitApp();
        }
      };
    }
  }

  private handleEntryDeselection() {
    fromEvent(this.document, 'mousedown')
      .pipe(tap((event: MouseEvent) => {
        if (this.isOutsideClick(event) && this.userInterfaceService.isIdle) {
          this.entryManager.selectedPasswords = [];
        }
      })).subscribe();
  }

  private onFileDrop() {
    fromEvent(this.document, 'drop')
      .pipe(tap((event: Event) => {
        const dataTransfer = (event as DragEvent).dataTransfer as DataTransfer;

        if (dataTransfer.files.length) {
          const file = dataTransfer.files[0] as any;

          if (file.path.endsWith(this.config.fileExtension)) {
            this.workspaceService.executeEvent().then(value => {
              if (value) {
                this.communicationService.ipcRenderer.send(IpcChannel.DropFile, file.path);
              }
            });
          }
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