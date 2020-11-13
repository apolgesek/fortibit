import { Component } from '@angular/core';
import { MenuItem } from 'primeng-lts/api';
import { ElectronService } from '@app/core/services';
import { AppConfig } from 'environments/environment';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss']
})
export class MenuBarComponent {
  public readonly fileItems = [{
    label: 'Open file...',
    command: () => {
      this.electronService.ipcRenderer.send('openFile');
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

  public helpItems = [{
    label: 'Release notes',
    command: () => {
      this.electronService.ipcRenderer.send('openUrl', AppConfig.urls.releaseNotes);
    }
  },
  {
    label: 'Report issue',
    command: () => {
      this.electronService.ipcRenderer.send('openUrl', AppConfig.urls.reportIssue); 
    }
  }];

  public readonly minimizeIconUrl = require('@assets/icons/min.svg').default;
  public readonly maximizeIconUrl = require('@assets/icons/max.svg').default;

  constructor(private electronService: ElectronService) { }

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
