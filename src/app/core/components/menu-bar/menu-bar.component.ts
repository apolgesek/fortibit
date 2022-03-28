import { Component, NgZone, OnInit } from '@angular/core';
import { EventType } from '@app/core/enums';
import { DialogsService } from '@app/core/services/dialogs.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { DatabaseType, IpcChannel } from '@shared-renderer/index';
import { AppConfig } from 'environments/environment';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss'],
})
export class MenuBarComponent implements OnInit {
  private maximizeIconPath: 'max-k' | 'restore-k' = 'max-k';

  public get closeIcons(): string {
    return [
      'assets/icons/close-k-10.png 1x',
      'assets/icons/close-k-12.png 1.25x',
      'assets/icons/close-k-15.png 1.5x',
      'assets/icons/close-k-15.png 1.75x',
      'assets/icons/close-k-20.png 2x',
      'assets/icons/close-k-20.png 2.25x',
      'assets/icons/close-k-24.png 2.5x',
      'assets/icons/close-k-30.png 3x',
      'assets/icons/close-k-30.png 3.5x'
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

  get isDatabasePristine(): boolean {
    return !!this.storageService.dateSaved;
  }

  constructor(
    private readonly zone: NgZone,
    private readonly electronService: ElectronService,
    private readonly storageService: StorageService,
    private readonly dialogsService: DialogsService
  ) {}

  ngOnInit() {
    this.electronService.ipcRenderer.on('windowMaximized', (_event, isMaximized: boolean) => {
      this.zone.run(() => {
        this.maximizeIconPath = isMaximized ? 'restore-k' : 'max-k';
      });
    });
  }

  exit(): false {
    this.quit();

    return false;
  }

  openFile(): false {
    this.storageService.checkFileSaved(EventType.OpenFile);

    return false;
  }

  save(): false {
    if (this.isDatabasePristine) return false;
  
    !this.storageService.file
      ? this.dialogsService.openMasterPasswordWindow()
      : this.storageService.saveDatabase();

    return false;
  }

  saveAs(): false {
    this.dialogsService.openMasterPasswordWindow({ forceNew: true });

    return false;
  }

  async import(): Promise<false> {
    const payload = await this.electronService.ipcRenderer.invoke(IpcChannel.GetImportedDatabaseMetadata, DatabaseType.Keepass);
    this.dialogsService.openImportedDbMetadataWindow(payload);

    return false;
  }

  openKeyboardShortcuts(): false {
    this.openUrl(AppConfig.urls.keyboardReference);

    return false;
  }

  openReleaseNotes(): false {
    this.openUrl(AppConfig.urls.releaseNotes);

    return false;
  }

  openReportIssue(): false {
    this.openUrl(AppConfig.urls.reportIssue);

    return false;
  }

  openAboutModal(): false {
    this.dialogsService.openAboutWindow();

    return false;
  }

  minimizeWindow() {
    this.electronService.ipcRenderer.send(IpcChannel.Minimize);
  }

  maximizeWindow() {
    this.electronService.ipcRenderer.send(IpcChannel.Maximize);
  }

  quit() {
    this.electronService.ipcRenderer.send(IpcChannel.Close);
  }

  private openUrl(path: string) {
    this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + path);
  }
}
