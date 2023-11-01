import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DbManager } from '@app/core/database';
import { IMessageBroker } from '@app/core/models';
import { ConfigService, NotificationService, WorkspaceService } from '@app/core/services';
import { ModalService } from '@app/core/services/modal.service';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { ImportHandler, IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { exportDB } from 'dexie-export-import';
import { AppConfig } from 'environments/environment';
import { MessageBroker } from 'injection-tokens';
import { Observable, fromEvent, merge } from 'rxjs';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule,
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective,
    FileNamePipe
  ]
})
export class MenuBarComponent implements OnInit, AfterViewInit {
  @ViewChild('topbar') public readonly topbar!: ElementRef;
  @ViewChild('overlay') public readonly overlay!: ElementRef; 

  public readonly importHandler = ImportHandler;
  public recentFiles: string[];
  public fullscreenMode: 'on' | 'off' = 'on';

  constructor(
    private readonly zone: NgZone,
    private readonly destroyRef: DestroyRef,
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly configService: ConfigService,
    private readonly workspaceService: WorkspaceService,
    private readonly modalService: ModalService,
    private readonly db: DbManager,
    private readonly notificationService: NotificationService
  ) {}

  get isDatabasePristine(): boolean {
    return !!this.workspaceService.isSynced;
  }

  get isLockingEnabled(): boolean {
    return this.workspaceService.file && !this.isLocked;
  }

  get isLocked(): boolean {
    return this.workspaceService.isLocked;
  }

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(config => {
      this.recentFiles = config.workspaces.recentlyOpened;
    });

    this.messageBroker.ipcRenderer.on(IpcChannel.GetRecentFiles, (_, files: string[]) => {
      this.zone.run(() => {
        this.recentFiles = files;
      });
    });
  }

  ngAfterViewInit() {
    this.fixMenuSize();
    this.zone.runOutsideAngular(() => {
      const windowMove$ = new Observable<void>(subscriber => {
        this.messageBroker.ipcRenderer.on(IpcChannel.RecalculateViewport, () => {
          subscriber.next();
        });
      });

      merge(fromEvent(window, 'resize'), windowMove$)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.fixMenuSize();
      });
    });
  }

  openExposedPasswordsWindow() {
    this.modalService.openExposedPasswordsWindow();
  }

  openWeakPasswordsWindow() {
    this.modalService.openWeakPasswordsWindow();
  }

  openChangePasswordWindow() {
    this.modalService.openPasswordChangeWindow();
  }

  async openFile(path?: string) {
    const success = await this.workspaceService.executeEvent();
    if (success) {
      this.messageBroker.ipcRenderer.send(IpcChannel.OpenFile, path);
    }
  }

  async newFile() {
    const success = await this.workspaceService.executeEvent();
    if (success) {
      await this.messageBroker.ipcRenderer.invoke(IpcChannel.CreateNew);
      this.workspaceService.createNew();
    }
  }

  save() {
    this.workspaceService.saveDatabase();
  }

  saveAs() {
    this.workspaceService.saveDatabase({ forceNew: true });
  }

  async import(handler: ImportHandler): Promise<void> {
    try {
      const payload = await this.messageBroker.ipcRenderer.invoke(IpcChannel.GetImportedDatabaseMetadata, handler);

      if (payload) {
        this.modalService.openImportedDbMetadataWindow(payload);
      }
    } catch (err) {
      this.notificationService.add({ type: 'error', message: err, alive: 8000 });
    }
  }

  async export(): Promise<void> {
    const blob = await exportDB(this.db.context);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = async () => {
      const exported = await this.messageBroker.ipcRenderer.invoke(IpcChannel.Export, fileReader.result);

      if (exported) {
        this.notificationService.add({ type: 'success', alive: 10 * 1000, message: 'Database exported' });
      }
    };
  }

  async lock() {
    const success = this.workspaceService.executeEvent();
    if (success) {
      this.workspaceService.lock({ minimize: true });
    }
  }

  openKeyboardShortcuts() {
    this.openUrl(AppConfig.urls.keyboardReference);
  }

  openReleaseNotes() {
    this.openUrl(AppConfig.urls.releaseNotes);
  }

  openReportIssue() {
    this.openUrl(AppConfig.urls.reportIssue);
  }

  openAboutWindow() {
    this.modalService.openAboutWindow();
  }

  openMaintenanceWindow() {
    this.modalService.openMaintenanceWindow();
  }

  openGeneratorWindow() {
    this.modalService.openGeneratorWindow();
  }

  exit() {
    this.messageBroker.ipcRenderer.send(IpcChannel.Close);
  }

  zoomIn() {
    this.messageBroker.ipcRenderer.send(IpcChannel.ZoomIn);
  }

  zoomOut() {
    this.messageBroker.ipcRenderer.send(IpcChannel.ZoomOut);
  }

  resetZoom() {
    this.messageBroker.ipcRenderer.send(IpcChannel.ResetZoom);
  }

  async fullscreen() {
    const isFullscreen = await this.messageBroker.ipcRenderer.invoke(IpcChannel.ToggleFullscreen);
    this.fullscreenMode = isFullscreen ? 'off' : 'on';
  }

  private fixMenuSize() {
    this.topbar.nativeElement.style.height = this.getViewportHeightUnit(2);
    this.overlay.nativeElement.style.height = this.getViewportHeightUnit(2);

    this.topbar.nativeElement.querySelectorAll('.menu-bar-item').forEach((e: HTMLElement) => {
      e.style.fontSize = this.getViewportHeightUnit(0.875);
      e.style.paddingLeft = this.getViewportHeightUnit(0.5);
      e.style.paddingRight = this.getViewportHeightUnit(0.5);
    });
    
    const logo: HTMLElement = this.topbar.nativeElement.querySelector('.brand-logo');
    logo.style.height = this.getViewportHeightUnit(1);
    logo.style.width = this.getViewportHeightUnit(1);
    logo.style.marginLeft = this.getViewportHeightUnit(0.5);
    logo.style.marginRight = this.getViewportHeightUnit(0.5);
  }

  private getViewportHeightUnit(rem: number): string {
    return (rem * 16 / window.outerHeight) * 100 + 'vh';
  }

  private openUrl(path: string) {
    this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + path);
  }
}
