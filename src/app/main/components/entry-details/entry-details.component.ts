import { Component } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ElectronService } from '@app/core/services';

@Component({
  selector: 'app-entry-details',
  templateUrl: './entry-details.component.html',
  styleUrls: ['./entry-details.component.scss'],
})
export class EntryDetailsComponent {

  get entry(): PasswordEntry {
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
    private electronService: ElectronService
  ) { }

  openUrl(url: string) {
    this.electronService.ipcRenderer.send('openUrl', url);
    return false;
  }

}
