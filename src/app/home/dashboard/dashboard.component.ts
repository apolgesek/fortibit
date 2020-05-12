import { Component, OnInit } from '@angular/core';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { DialogService } from 'primeng/api';
import { NewEntryComponent } from '../new-entry/new-entry.component';
import { PasswordEntry } from '@app/core/models/password-entry.model';
const logoURL = require('../../../assets/images/lock.svg');

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  public newPassword: string = '';
  public newPasswordRepeat: string = '';
  public selectedCategoryData: PasswordEntry[];

  get isDateSaved(): boolean {
    return !!this.passwordStore.dateSaved;
  }

  get isAnyPassword(): boolean {
    return this.selectedCategoryData?.length > 0;
  }

  get isRowSelected(): boolean {
    return !!this.passwordStore.selectedPassword;
  }

  get logoURL(): string {
    return logoURL;
  }

  get filePath(): string {
    return this.passwordStore.filePath ? ".../" + this.passwordStore.filePath.split("/").slice(-2).join("/") : '';
  }

  get isNewPasswordDialogShown(): boolean {
    return this.passwordStore.isNewPasswordDialogShown;
  }

  set isNewPasswordDialogShown(value: boolean) {
    this.passwordStore.isNewPasswordDialogShown = value;
  }

  constructor(
    private passwordStore: PasswordStoreService,
    private dialogService: DialogService,
  ) { }

  ngOnInit(): void {
    this.selectedCategoryData = this.passwordStore.selectedCategory?.data;
  }

  openAddEntryWindow() {
    this.passwordStore.openAddEntryWindow();
  }

  searchEntries(event: any) {
    this.passwordStore.filterEntries(event.target.value);
  }

  saveNewDatabase() {
    this.passwordStore.saveNewDatabase(this.newPassword);
  }

  trySaveDatabase() {
    this.passwordStore.trySaveDatabase();
  }

  openEditEntryWindow() {
    this.passwordStore.openEditEntryWindow();
  }

  openDeleteEntryWindow() {
    this.passwordStore.openDeleteEntryWindow();
  }

}
