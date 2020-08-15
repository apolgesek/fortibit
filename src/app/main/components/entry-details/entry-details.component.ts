import { Component } from '@angular/core';
import { DatabaseService } from '@app/core/services/database.service';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ElectronService } from '@app/core/services';

@Component({
  selector: 'app-entry-details',
  templateUrl: './entry-details.component.html',
  styleUrls: ['./entry-details.component.scss'],
})
export class EntryDetailsComponent {

  get entry(): PasswordEntry {
    return this.databaseService.selectedPasswords[0];
  }

  get isEntrySelected(): boolean {
    return this.databaseService.selectedPasswords.length === 1;
  }

  get databaseInformation(): { name: string } {
    return {
      name: this.databaseService.databaseFileName
    };
  }

  constructor(
    private databaseService: DatabaseService,
    private electronService: ElectronService
  ) { }

  openUrl(url: string) {
    this.electronService.ipcRenderer.send('openUrl', url);
    return false;
  }

}
