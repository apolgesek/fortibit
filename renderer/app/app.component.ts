import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, NgZone, OnInit, ViewContainerRef } from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { IpcChannel } from '../../shared/ipc-channel.enum';
import { MessageBroker } from 'injection-tokens';
import { filter, fromEvent, take } from 'rxjs';
import { IAppConfig } from '../../app-config';
import { AppConfig } from '../environments/environment';
import { IMessageBroker } from './core/models';
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

  constructor(
    @Inject(MessageBroker) public readonly messageBroker: IMessageBroker,
    private readonly router: Router,
    private readonly configService: ConfigService,
    private readonly modalManager: ModalManager,
    private readonly appViewContainer: AppViewContainer,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly userInterfaceService: ComponentGridService,
    private readonly zone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.appViewContainer.appViewContainerRef = this.viewContainerRef;
  }

  @HostListener('document:dragenter', ['$event'])
  private onDragEnter(event: MouseEvent) {
    event.preventDefault();
  }

  async ngOnInit(): Promise<void> {
    this.closeModalsOnRouteChange();
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config;
      this.registerGlobalEvents();
    });

    try {
      await this.preloadFonts();
      this.fontsLoaded = true;
    } catch (err) {
      console.log('Failed to fetch fonts');
    }
  }

  private registerGlobalEvents() {
    this.handleMouseClick();
    this.onDragOverApp();
    this.onFileDrop();
    this.handleEntryDeselection();
    this.handleAppExit();
  }

  private preloadFonts(): Promise<FontFace[]> {
    const fontsArray = [];
    document.fonts.forEach(x => fontsArray.push(x));

    return Promise.all(fontsArray.map(x => x.status === 'unloaded' && x.load()));
  }

  private closeModalsOnRouteChange() {
    this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe(() => {
      this.modalManager.openedModals.forEach(m => this.modalManager.close(m));
    });
  }

  private handleMouseClick() {
    fromEvent(window, 'mouseup')
      .subscribe(() => (event: MouseEvent) => {
      // Block back/forward navigation mouse side buttons
        if (event.button === 3 || event.button === 4) {
          event.preventDefault();
        }
      });
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
      .subscribe(() => (event: MouseEvent) => {
        if (this.isOutsideClick(event) && this.userInterfaceService.isIdle) {
          this.entryManager.selectedPasswords = [];
        }
      });
  }

  private onFileDrop() {
    fromEvent(this.document, 'drop')
      .subscribe(async (event: Event) => {
        event.preventDefault();
        const dataTransfer = (event as DragEvent).dataTransfer as DataTransfer;

        if (dataTransfer.files.length) {
          const file = dataTransfer.files[0] as any;

          if (!file.path.endsWith(this.config.fileExtension)) {
            return;
          }

          const success = await this.workspaceService.executeEvent();
          if (success) {
            this.messageBroker.ipcRenderer.send(IpcChannel.DropFile, file.path);
          }
        }
      });
  }

  private onDragOverApp() {
    fromEvent(this.document, 'dragover')
      .subscribe(() => (event: Event) => {
        (event as MouseEvent).preventDefault();
      });
  }

  private isOutsideClick(event: MouseEvent) {
    const targetElement = event.target as Element;
    return !targetElement.closest('[data-prevent-entry-deselect]');
  }
}
