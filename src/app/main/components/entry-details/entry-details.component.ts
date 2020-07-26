import { Component } from '@angular/core';
import { PasswordStoreService } from '@app/core/services/password-store.service';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ElectronService } from '@app/core/services';

@Component({
  selector: 'app-entry-details',
  templateUrl: './entry-details.component.html',
  styleUrls: ['./entry-details.component.scss'],
})
export class EntryDetailsComponent {

  get entry(): PasswordEntry {
    return this.passwordStore.selectedPasswords[0];
  }

  get isEntrySelected(): boolean {
    return this.passwordStore.selectedPasswords.length === 1;
  }

  get databaseInformation(): { name: string } {
    return {
      name: this.passwordStore.databaseFileName
    };
  }

  constructor(
    private passwordStore: PasswordStoreService,
    private electronService: ElectronService
  ) { }

  openUrl(url: string) {
    this.electronService.ipcRenderer.send('openUrl', url);
    return false;
  }

}
