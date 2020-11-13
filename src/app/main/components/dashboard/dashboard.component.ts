import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, tap } from 'rxjs/operators';
import { HotkeyService, SearchService } from '@app/core/services';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('search') search: ElementRef;

  private destroyed$ = new Subject<void>();

  get isDatabaseDirty(): boolean {
    return !!this.storageService.dateSaved;
  }

  get isAnyEntry(): boolean {
    return this.storageService.selectedCategory.data?.length > 0;
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

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private dialogsService: DialogsService,
    private hotkeyService: HotkeyService
  ) { }

  ngAfterViewInit(): void {
    fromEvent(this.search.nativeElement, 'keyup').pipe(
      distinctUntilChanged(),
      debounceTime(500),
      tap((event: KeyboardEvent) => {
        this.searchService.search((event.target as HTMLInputElement).value);
      }),
      takeUntil(this.destroyed$)
    ).subscribe();

    fromEvent(window, 'keydown')
      .pipe(
        tap((event: KeyboardEvent) => {
          this.hotkeyService.intercept(event);
        }),
        takeUntil(this.destroyed$)
      ).subscribe();
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
