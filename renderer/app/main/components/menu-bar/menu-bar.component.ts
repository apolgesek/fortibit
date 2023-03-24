import { CommonModule } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { DbManager } from '@app/core/database';
import { ICommunicationService } from '@app/core/models';
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
import { CommunicationService } from 'injection-tokens';
import { Subject, takeUntil } from 'rxjs';

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
export class MenuBarComponent implements OnInit, OnDestroy {
  public readonly importHandler = ImportHandler;
  private readonly destroyed = new Subject<void>();

  public recentFiles: string[];
  private theme: 'w' | 'k' = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'w' : 'k';
  private maximizeIconPath: string = `max-${this.theme}`;
  private isMaximized: boolean;

  public get maximizeRestoreIcons(): string {
    return [
      `assets/icons/${this.maximizeIconPath}-10.png 1x`,
      `assets/icons/${this.maximizeIconPath}-12.png 1.25x`,
      `assets/icons/${this.maximizeIconPath}-15.png 1.5x`,
      `assets/icons/${this.maximizeIconPath}-15.png 1.75x`,
      `assets/icons/${this.maximizeIconPath}-20.png 2x`,
      `assets/icons/${this.maximizeIconPath}-20.png 2.25x`,
      `assets/icons/${this.maximizeIconPath}-24.png 2.5x`,
      `assets/icons/${this.maximizeIconPath}-30.png 3x`,
      `assets/icons/${this.maximizeIconPath}-30.png 3.5x`
    ].join(',');
  }

  public get minimizeIcons(): string {
    return [
      `assets/icons/min-${this.theme}-10.png 1x`,
      `assets/icons/min-${this.theme}-12.png 1.25x`,
      `assets/icons/min-${this.theme}-15.png 1.5x`,
      `assets/icons/min-${this.theme}-15.png 1.75x`,
      `assets/icons/min-${this.theme}-20.png 2x`,
      `assets/icons/min-${this.theme}-20.png 2.25x`,
      `assets/icons/min-${this.theme}-24.png 2.5x`,
      `assets/icons/min-${this.theme}-30.png 3x`,
      `assets/icons/min-${this.theme}-30.png 3.5x`
    ].join(',');
  }

  public get closeIcons(): string {
    return [
      `assets/icons/close-${this.theme}-10.png 1x`,
      `assets/icons/close-${this.theme}-12.png 1.25x`,
      `assets/icons/close-${this.theme}-15.png 1.5x`,
      `assets/icons/close-${this.theme}-15.png 1.75x`,
      `assets/icons/close-${this.theme}-20.png 2x`,
      `assets/icons/close-${this.theme}-20.png 2.25x`,
      `assets/icons/close-${this.theme}-24.png 2.5x`,
      `assets/icons/close-${this.theme}-30.png 3x`,
      `assets/icons/close-${this.theme}-30.png 3.5x`
    ].join(',');
  }

  get isDatabasePristine(): boolean {
    return !!this.workspaceService.isSynced;
  }

  get isLockingEnabled(): boolean {
    return this.workspaceService.file && !this.isLocked;
  }

  get isLocked(): boolean {
    return this.workspaceService.isLocked;
  }

  constructor(
    private readonly zone: NgZone,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
    private readonly workspaceService: WorkspaceService,
    private readonly modalService: ModalService,
    private readonly db: DbManager,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      this.theme = event.matches ? "w" : "k";
      this.maximizeIconPath = this.isMaximized ? `restore-${this.theme}` : `max-${this.theme}`;
    });

    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed)).subscribe(config => {
      this.recentFiles = config.workspaces.recentlyOpened;
    });

    this.communicationService.ipcRenderer.on(IpcChannel.MaximizedRestored, (_event, isMaximized: boolean) => {
      this.zone.run(() => {
        this.isMaximized = isMaximized;
        this.maximizeIconPath = isMaximized ? `restore-${this.theme}` : `max-${this.theme}`;
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  exit() {
    this.quit();
  }

  openExposedPasswordsWindow() {
    this.modalService.openExposedPasswordsWindow();
  }

  openWeakPasswordsWindow() {
    this.modalService.openWeakPasswordsWindow();
  }

  openFile(path?: string) {
    this.workspaceService.executeEvent().then(value => {
      if (value) {
        this.communicationService.ipcRenderer.send(IpcChannel.OpenFile, path);
      }
    });
  }

  newFile() {
    this.workspaceService.executeEvent().then(value => {
      if (value) {
        this.communicationService.ipcRenderer.invoke(IpcChannel.CreateNew).then(() => this.workspaceService.createNew());
      }
    });
  }

  save() {  
    !this.workspaceService.file
      ? this.modalService.openMasterPasswordWindow()
      : this.workspaceService.saveDatabase();
  }

  saveAs() {
    this.modalService.openMasterPasswordWindow({ forceNew: true });
  }

  async import(handler: ImportHandler): Promise<void> {
    const payload = await this.communicationService.ipcRenderer.invoke(IpcChannel.GetImportedDatabaseMetadata, handler);
    
    if (payload) {
      this.modalService.openImportedDbMetadataWindow(payload);
    }
  }

  async export(): Promise<void> {
    const blob = await exportDB(this.db.context);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = async () => {
      const exported = await this.communicationService.ipcRenderer.invoke(IpcChannel.Export, fileReader.result);

      if (exported) {
        this.notificationService.add({ type: 'success', alive: 5000, message: 'Database exported' });
      }
    };
  }

  lock() {
    this.workspaceService.executeEvent().then(value => {
      if (value) {
        this.workspaceService.lock({ minimize: true });
      }
    });
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

  openAboutModal() {
    this.modalService.openAboutWindow();
  }

  minimizeWindow() {
    this.communicationService.ipcRenderer.send(IpcChannel.Minimize);
  }

  maximizeWindow() {
    this.communicationService.ipcRenderer.send(IpcChannel.Maximize);
  }

  quit() {
    this.communicationService.ipcRenderer.send(IpcChannel.Close);
  }

  private openUrl(path: string) {
    this.communicationService.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + path);
  }
}
