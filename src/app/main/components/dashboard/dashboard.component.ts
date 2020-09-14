import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { StorageService } from '@app/core/services/storage.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { SearchService } from '@app/core/services';

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
    return !!this.storageService.dateSaved;
  }

  get isAnyEntry(): boolean {
    return this.selectedCategoryData?.length > 0;
  }

  get isOneEntrySelected(): boolean {
    return this.storageService.selectedPasswords.length === 1;
  }

  get isAnyEntrySelected(): boolean {
    return this.storageService.selectedPasswords.length > 0;
  }

  get selectedPasswordsCount(): number {
    return this.storageService.selectedPasswords.length;
  }

  get logoURL(): string {
    return logoURL.default;
  }

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private dialogsService: DialogsService
  ) { }

  ngOnInit(): void {
    this.selectedCategoryData = this.storageService.selectedCategory?.data;
  }

  ngAfterViewInit(): void {
    fromEvent(this.search.nativeElement, 'keyup').pipe(
      distinctUntilChanged(),
      debounceTime(500),
      takeUntil(this.destroyed$)
    ).subscribe((event: KeyboardEvent) => {
      this.searchService.search((event.target as HTMLInputElement).value);
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddEntryWindow() {
    this.storageService.editedEntry = undefined;
    this.dialogsService.openEntryWindow();
  }

  openEditEntryWindow() {
    this.storageService.editedEntry = this.storageService.selectedPasswords[0];
    this.dialogsService.openEntryWindow();
  }

  openDeleteEntryWindow() {
    this.dialogsService.openDeleteEntryWindow();
  }

  trySaveDatabase() {
    !this.storageService.file ? this.dialogsService.openMasterPasswordWindow() : this.storageService.saveDatabase(null);
  }
}
