import { Component } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { IPasswordEntry } from '@app/core/models/password-entry.model';
import { CoreService, ElectronService } from '@app/core/services';
import { AppConfig } from 'environments/environment';

@Component({
  selector: 'app-entry-details',
  templateUrl: './entry-details.component.html',
  styleUrls: ['./entry-details.component.scss'],
})
export class EntryDetailsComponent {
  get version(): string {
    return this.coreService.version;
  }

  get entry(): IPasswordEntry {
    return this.storageService.selectedPasswords[0];
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

  openUrl(url: string) {
    this.electronService.ipcRenderer.send('openUrl', url);
    return false;
  }

  openAutotypeInformation() {
    this.coreService.openRepositoryLink(AppConfig.urls.keyboardReference + AppConfig.urls.autotypeShortcut);
  }
}
