import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, NgZone, OnInit } from '@angular/core';
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
export class MenuBarComponent implements OnInit {
  public readonly importHandler = ImportHandler;
  public recentFiles: string[];

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

  openExposedPasswordsWindow() {
    this.modalService.openExposedPasswordsWindow();
  }

  openWeakPasswordsWindow() {
    this.modalService.openWeakPasswordsWindow();
  }

  openChangePasswordWindow() {
    this.modalService.openPasswordChangeWindow();
  }

  openFile(path?: string) {
    const success = this.workspaceService.executeEvent();
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
    const payload = await this.messageBroker.ipcRenderer.invoke(IpcChannel.GetImportedDatabaseMetadata, handler);

    if (payload) {
      this.modalService.openImportedDbMetadataWindow(payload);
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

  exit() {
    this.messageBroker.ipcRenderer.send(IpcChannel.Close);
  }

  private openUrl(path: string) {
    this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + path);
  }
}
