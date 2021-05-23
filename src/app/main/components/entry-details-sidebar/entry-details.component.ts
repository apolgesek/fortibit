import { Component, Input } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { IPasswordEntry } from '@app/core/models/password-entry.model';
import { CoreService, ElectronService } from '@app/core/services';
import { AppConfig } from 'environments/environment';
import { IPasswordGroup } from '@app/core/models';
import { IpcChannel } from '@shared-models/*';

@Component({
  selector: 'app-entry-details-sidebar',
  templateUrl: './entry-details-sidebar.component.html',
  styleUrls: ['./entry-details-sidebar.component.scss'],
})
export class EntryDetailsSidebarComponent {
  public entryInfo: IPasswordEntry | undefined;
  public group: IPasswordGroup | undefined;

  @Input('entry') set entry(value: IPasswordEntry | undefined) {
    this.entryInfo = value;
    if (value) {
      this.group = this.findGroup(this.storageService.groups[0], value.groupId);
    } else {
      this.group = undefined;
    }
  }

  get config(): any {
    return this.coreService.config;
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
    private storageService: StorageService,
    private electronService: ElectronService,
    private coreService: CoreService
  ) { }

  openUrl(url: string | undefined) {
    if (url) {
      this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, url);
    }
  }

  openAutotypeInformation() {
    this.coreService.openRepositoryLink(AppConfig.urls.keyboardReference + AppConfig.urls.autotypeShortcut);
  }

  private findGroup(group: IPasswordGroup, id: number): IPasswordGroup | undefined {
    if (group.id === id) {
      return group;
    }

    if (!group.children?.length) {
      return;
    }

    for (const child of group.children) {
      const g = this.findGroup(child, id);

      if (g) {
        return g;
      }
    }

    return;
  }
}
