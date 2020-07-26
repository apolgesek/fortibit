import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { PasswordStoreService } from '@app/core/services/password-store.service';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
const logoURL = require('assets/images/lock.svg');

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  public selectedCategoryData: PasswordEntry[];
  @ViewChild('search') search: ElementRef;

  private destroyed$ = new Subject<void>();

  get isDatabaseDirty(): boolean {
    return !!this.passwordStore.dateSaved;
  }

  get isAnyEntry(): boolean {
    return this.selectedCategoryData?.length > 0;
  }

  get isOneEntrySelected(): boolean {
    return this.passwordStore.selectedPasswords.length === 1;
  }

  get isAnyEntrySelected(): boolean {
    return this.passwordStore.selectedPasswords.length > 0;
  }

  get selectedPasswordsCount(): number {
    return this.passwordStore.selectedPasswords.length;
  }

  get logoURL(): string {
    return logoURL.default;
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
    ).subscribe((event: KeyboardEvent) => {
      this.passwordStore.searchEntries((event.target as HTMLInputElement).value);
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddEntryWindow() {
    this.passwordStore.openAddEntryWindow();
  }

  openEditEntryWindow() {
    this.passwordStore.openEditEntryWindow();
  }

  openDeleteEntryWindow() {
    this.passwordStore.openDeleteEntryWindow();
  }

  trySaveDatabase() {
    this.passwordStore.trySaveDatabase();
  }
}
