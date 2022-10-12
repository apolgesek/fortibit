import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { EventType } from '@app/core/enums';
import { ModalService } from '@app/core/services/modal.service';
import { ImportHandler, IpcChannel } from '@shared-renderer/index';
import { AppConfig } from 'environments/environment';
import { ICommunicationService } from '@app/core/models';
import { NotificationService, WorkspaceService } from '@app/core/services';
import { exportDB } from 'dexie-export-import';
import { DbContext } from '@app/core/database';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { DropdownDirective, DropdownMenuDirective, DropdownToggleDirective } from '@app/shared';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { CommunicationService } from 'injection-tokens';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss'],
  standalone: true,
  imports: [
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective
  ]
})
export class MenuBarComponent implements OnInit {
  private maximizeIconPath: 'max-k' | 'restore-k' = 'max-k';

  public readonly importHandler = ImportHandler;

  public get closeIcons(): string {
    return [
      'assets/icons/close.png',
    ].join(',');
  }

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
      `assets/icons/min-k-10.png 1x`,
      `assets/icons/min-k-12.png 1.25x`,
      `assets/icons/min-k-15.png 1.5x`,
      `assets/icons/min-k-15.png 1.75x`,
      `assets/icons/min-k-20.png 2x`,
      `assets/icons/min-k-20.png 2.25x`,
      `assets/icons/min-k-24.png 2.5x`,
      `assets/icons/min-k-30.png 3x`,
      `assets/icons/min-k-30.png 3.5x`
    ].join(',');
  }

  get isDatabasePristine(): boolean {
    return !!this.workspaceService.dateSaved;
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
    private readonly workspaceService: WorkspaceService,
    private readonly modalService: ModalService,
    private readonly dbContext: DbContext,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.communicationService.ipcRenderer.on('windowMaximized', (_event, isMaximized: boolean) => {
      this.zone.run(() => {
        this.maximizeIconPath = isMaximized ? 'restore-k' : 'max-k';
      });
    });
  }

  exit() {
    this.quit();
  }

  openExposedPasswordsWindow() {
    this.modalService.openExposedPasswordsWindow();
  }

  openFile() {
    this.workspaceService.checkFileSaved(EventType.OpenFile);
  }

  save() {  
    !this.workspaceService.file
      ? this.modalService.openMasterPasswordWindow()
      : this.workspaceService.saveDatabase(null);
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
    const blob = await exportDB(this.dbContext);

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
    this.workspaceService.checkFileSaved(EventType.Lock);
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
