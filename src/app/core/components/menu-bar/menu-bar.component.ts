import { Component } from '@angular/core';
import { CoreService, ElectronService } from '@app/core/services';
import { AppConfig } from 'environments/environment';
import { EventType } from '@app/core/enums';
import { IpcChannel } from '@shared-models/*';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss']
})
export class MenuBarComponent {
  constructor(
    private electronService: ElectronService,
    private coreService: CoreService
  ) { }

  exit() {
    this.quit();
  }

  openFile() {
    this.coreService.checkFileSaved(EventType.OpenFile);
  }

  openKeyboardShortcuts() {
    this.coreService.openRepositoryLink(AppConfig.urls.keyboardReference);
  }

  openReleaseNotes() {
    this.coreService.openRepositoryLink(AppConfig.urls.releaseNotes);
  }

  openReportIssue() {
    this.coreService.openRepositoryLink(AppConfig.urls.reportIssue);
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
}
