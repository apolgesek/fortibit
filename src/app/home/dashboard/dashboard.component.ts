import { Component } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { ConfirmationService } from 'primeng/api';
const logoURL = require('../../../assets/images/lock.svg');

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  public isNewPasswordDialogShown = false;
  public newPassword: string = '';
  public newPasswordRepeat: string = '';

  get isAnyPassword(): boolean {
    return this.passwordStore.passwordList.length > 0;
  }

  get isDateSaved(): boolean {
    return !!this.passwordStore.dateSaved;
  }

  get isRowSelected() {
    return this.passwordStore.selectedPassword;
  }

  get logoURL() {
    return logoURL;
  }

  constructor(
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService,
    private confirmDialogService: ConfirmationService
  ) { }

  openNewEntryWindow() {
    this.electronService.ipcRenderer.send('openNewEntryWindow');
  }

  openEditEntryWindow() {
    this.electronService.ipcRenderer.send('openEditEntryWindow', this.passwordStore.selectedPassword);
  }

  openDeleteEntryWindow() {
    console.log(this.confirmDialogService);
    this.confirmDialogService.confirm({
      message: 'Are you sure you want to delete this entry?',
      accept: () => {
        this.passwordStore.deleteEntry();
      }
    });
  }

  searchEntries(event: any) {
    this.passwordStore.filterEntries(event.target.value);
  }

  trySaveDatabase() {
    if (!this.passwordStore.filePath) {
      this.isNewPasswordDialogShown = true;
    } else {
      this.passwordStore.saveDatabase(null);
    }
  }

  saveNewDatabase() {
    this.passwordStore.saveDatabase(this.newPassword);
    this.isNewPasswordDialogShown = false;
  }

}
