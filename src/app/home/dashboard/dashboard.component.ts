import { Component } from '@angular/core';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { ConfirmationService, DialogService } from 'primeng/api';
import { NewEntryComponent } from '../new-entry/new-entry.component';
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

  get filePath() {
    return this.passwordStore.filePath ? ".../" + this.passwordStore.filePath.split("/").slice(-2).join("/") : '';
  }

  constructor(
    private passwordStore: PasswordStoreService,
    private confirmDialogService: ConfirmationService,
    private dialogService: DialogService,
  ) { }

  openNewEntryWindow() {
    this.dialogService.open(NewEntryComponent, {width: '70%', header: 'Add new entry'});
  }

  openEditEntryWindow() {
    this.dialogService.open(NewEntryComponent, {width: '70%', header: 'Edit entry', data: this.passwordStore.selectedPassword});
  }

  openDeleteEntryWindow() {
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
