import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { fromEvent, Subject } from 'rxjs';
import { distinctUntilChanged, debounceTime, takeUntil } from 'rxjs/operators';
const logoURL = require('../../../assets/images/lock.svg');

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  public newPassword: string = '';
  public newPasswordRepeat: string = '';
  public selectedCategoryData: PasswordEntry[];

  @ViewChild('search') search: ElementRef;

  private destroyed$ = new Subject<void>();

  get isDateSaved(): boolean {
    return !!this.passwordStore.dateSaved;
  }

  get isAnyPassword(): boolean {
    return this.selectedCategoryData?.length > 0;
  }

  get isOneRowSelected(): boolean {
    return this.passwordStore.selectedPasswords.length === 1;
  }

  get isAnyRowSelected(): boolean {
    return this.passwordStore.selectedPasswords.length > 0;
  }

  get selectedRowsCount(): number {
    return this.passwordStore.selectedPasswords.length;
  }

  get logoURL(): string {
    return logoURL.default;
  }

  get isRemoveEntryDialogShown(): boolean {
    return this.passwordStore.isRemoveEntryDialogShown;
  }

  set isRemoveEntryDialogShown(value: boolean) {
    this.passwordStore.isRemoveEntryDialogShown = value;
  }

  get isNewPasswordDialogShown(): boolean {
    return this.passwordStore.isNewPasswordDialogShown;
  }

  set isNewPasswordDialogShown(value: boolean) {
    this.passwordStore.isNewPasswordDialogShown = value;
  }

  get isConfirmExitDialogShown(): boolean {
    return this.passwordStore.isConfirmExitDialogShown;
  }

  set isConfirmExitDialogShown(value: boolean) {
    this.passwordStore.isConfirmExitDialogShown = value;
  }

  get isConfirmGroupRemoveDialogShown(): boolean {
    return this.passwordStore.isConfirmGroupRemoveDialogShown;
  }

  set isConfirmGroupRemoveDialogShown(value: boolean) {
    this.passwordStore.isConfirmGroupRemoveDialogShown = value;
  }

  constructor(private passwordStore: PasswordStoreService) { }

  ngOnInit(): void {
    this.selectedCategoryData = this.passwordStore.selectedCategory?.data;
  }

  ngAfterViewInit(): void {
    fromEvent(this.search.nativeElement, 'keyup').pipe(
      distinctUntilChanged(),
      debounceTime(500),
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      this.passwordStore.filterEntries(this.search.nativeElement.value);
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddEntryWindow() {
    this.passwordStore.openAddEntryWindow();
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

  deleteEntry() {
    this.passwordStore.deleteEntry();
    this.closeRemoveEntryDialog();
  }

  closeRemoveEntryDialog() {
    this.isRemoveEntryDialogShown = false;
  }

  closeConfirmExitDialog() {
    this.isConfirmExitDialogShown = false;
  }

  closeConfirmGroupRemoveDialog() {
    this.isConfirmGroupRemoveDialogShown = false;
  }

  exitApp() {
    this.passwordStore.exitApp();
  }

  removeGroup() {
    this.passwordStore.removeGroup();
    this.closeConfirmGroupRemoveDialog();
  }

}
