import { Component } from '@angular/core';
import { IPasswordGroup } from '@app/core/models';
import { ConfigService } from '@app/core/services/config.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { AppConfig } from 'environments/environment';
import { IAppConfig } from '../../../../../app-config';

@Component({
  selector: 'app-entry-details-sidebar',
  templateUrl: './entry-details-sidebar.component.html',
  styleUrls: ['./entry-details-sidebar.component.scss'],
})
export class EntryDetailsSidebarComponent {
  get entry(): IPasswordEntry & { group: string } | undefined {
    if (this.storageService.selectedPasswords.length === 1) {
      const group = this.findGroup(this.storageService.groups[0], this.storageService.selectedPasswords[0].groupId);

      return {...this.storageService.selectedPasswords[0], group: group.name};
    } else {
      return undefined;
    }
  }

  get config(): IAppConfig {
    return this.configService.config as IAppConfig;
  }

  get isEntrySelected(): boolean {
    return this.storageService.selectedPasswords.length === 1;
  }

  get databaseInformation(): { name: string } {
    return {
      name: this.storageService.databaseFileName
    };
  }

  constructor(
    private readonly storageService: StorageService,
    private readonly electronService: ElectronService,
    private readonly configService: ConfigService,
  ) {}

  openUrl(url: string | undefined) {
    if (url) {
      this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, url);
    }
  }

  openAutotypeInformation() {
    this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + AppConfig.urls.keyboardReference + AppConfig.urls.autotypeShortcut);
  }

  private findGroup(group: IPasswordGroup, id: number): IPasswordGroup | undefined {
    if (group.id === id) {
      return group;
    }

    if (!group.children?.length) {
      return;
    }

    for (const child of group.children) {
      const group = this.findGroup(child, id);

      if (group) {
        return group;
      }
    }

    return;
  }
}
