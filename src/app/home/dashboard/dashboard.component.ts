import { Component } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  constructor(
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService
  ) { }

  get isAnyPassword(): boolean {
    return this.passwordStore.passwordList.length > 0;
  }

  get isDateSaved(): boolean {
    return !!this.passwordStore.dateSaved;
  }

  get isRowSelected() {
    return this.passwordStore.selectedPassword;
  }

  openNewEntryWindow() {
    this.electronService.ipcRenderer.send('openNewEntryWindow');
  }

  openEditEntryWindow() {
    this.electronService.ipcRenderer.send('openEditEntryWindow', this.passwordStore.selectedPassword);
  }

  openDeleteEntryWindow() {
    this.passwordStore.deleteEntry();
  }

  searchEntries(event: any) {
    this.passwordStore.filterEntries(event.target.value);
  }

  saveDatabase() {
    this.electronService.ipcRenderer.send('saveFile', this.passwordStore.passwordList);
    this.passwordStore.setDateSaved();
  }

}
