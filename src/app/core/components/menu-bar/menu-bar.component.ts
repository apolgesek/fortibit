import { Component } from '@angular/core';
import { MenuItem } from 'primeng-lts/api';
import { CoreService, ElectronService } from '@app/core/services';
import { AppConfig } from 'environments/environment';
import { EventType } from '@app/core/enums';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss']
})
export class MenuBarComponent {
  public readonly fileItems = [{
    label: 'Open file...',
    command: () => {
      this.coreService.checkFileSaved(EventType.OpenFile);
    }
  },
  {
    separator: true
  },
  {
    label: 'Exit',
    command: () => {
      this.quit();
    }
  }] as MenuItem[];

public helpItems = [
  {
    label: 'Keyboard shortcuts',
    command: () => {
      this.coreService.openRepositoryLink(AppConfig.urls.keyboardReference);
    }
  },
  {
    separator: true
  },
  {
    label: 'Release notes',
    command: () => {
      this.coreService.openRepositoryLink(AppConfig.urls.releaseNotes);
    }
  },
  {
    label: 'Report issue',
    command: () => {
      this.coreService.openRepositoryLink(AppConfig.urls.reportIssue);
    }
  }
] as MenuItem[];

  public readonly minimizeIconUrl = require('@assets/icons/min.svg').default;
  public readonly maximizeIconUrl = require('@assets/icons/max.svg').default;

  constructor(
    private electronService: ElectronService,
    private coreService: CoreService
  ) { }

  minimizeWindow() {
    this.electronService.ipcRenderer.send('minimize');
  }

  maximizeWindow() {
    this.electronService.ipcRenderer.send('maximize');
  }

  quit() {
    this.electronService.ipcRenderer.send('close');
  }
}
