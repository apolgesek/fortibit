import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { DatabaseService } from '@app/core/services/database.service';
import { DialogsService } from '@app/core/services/dialogs.service';
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
    return !!this.databaseService.dateSaved;
  }

  get isAnyEntry(): boolean {
    return this.selectedCategoryData?.length > 0;
  }

  get isOneEntrySelected(): boolean {
    return this.databaseService.selectedPasswords.length === 1;
  }

  get isAnyEntrySelected(): boolean {
    return this.databaseService.selectedPasswords.length > 0;
  }

  get selectedPasswordsCount(): number {
    return this.databaseService.selectedPasswords.length;
  }

  get logoURL(): string {
    return logoURL.default;
  }

  constructor(
    private databaseService: DatabaseService,
    private dialogsService: DialogsService
  ) { }

  ngOnInit(): void {
    this.selectedCategoryData = this.databaseService.selectedCategory?.data;
  }

  ngAfterViewInit(): void {
    fromEvent(this.search.nativeElement, 'keyup').pipe(
      distinctUntilChanged(),
      debounceTime(500),
      takeUntil(this.destroyed$)
    ).subscribe((event: KeyboardEvent) => {
      this.databaseService.searchEntries((event.target as HTMLInputElement).value);
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddEntryWindow() {
    this.databaseService.editedEntry = undefined;
    this.dialogsService.openEntryWindow();
  }

  openEditEntryWindow() {
    this.databaseService.editedEntry = this.databaseService.selectedPasswords[0];
    this.dialogsService.openEntryWindow();
  }

  openDeleteEntryWindow() {
    this.dialogsService.openDeleteEntryWindow();
  }

  trySaveDatabase() {
    !this.databaseService.file ? this.dialogsService.openMasterPasswordWindow() : this.databaseService.saveDatabase(null);
  }
}
