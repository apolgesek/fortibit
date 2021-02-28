import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, tap } from 'rxjs/operators';
import { CoreService, HotkeyService, SearchService } from '@app/core/services';
import { EventType } from '@app/core/enums';
import { AppConfig } from 'environments/environment';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('fade', [
      state('in', style({opacity: 1})),

      transition(':enter', [
        style({opacity: 0}),
        animate(150)
      ]),

      transition(':leave',
        animate(150, style({opacity: 0})))
    ])
  ]
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  public isSearching = false;
  public wasSearched = false;

  private searchStream$ = new Subject<string>();
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

  get entriesFound(): Observable<number> {
    return this.storageService.entriesFound$;
  }

  get searchPhrase(): string {
    return this.searchService.searchPhraseValue;
  }

  set searchPhrase(value: string) {
    this.searchService.searchPhraseValue = value;
    this.searchStream$.next(value);
  }

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private dialogsService: DialogsService,
    private hotkeyService: HotkeyService,
    private coreService: CoreService,
  ) { }

  ngAfterViewInit(): void {
    fromEvent(window, 'keydown')
      .pipe(
        tap((event: KeyboardEvent) => {
          this.hotkeyService.intercept(event);
        }),
        takeUntil(this.destroyed$)
      ).subscribe();

    // confirm unsaved database
    const productionMode = AppConfig.environment !== 'LOCAL';
    // const productionMode = true;
    if (productionMode) {
      window.onbeforeunload = (event) => {
        this.coreService.checkFileSaved(EventType.Exit);
        event.returnValue = false;
      };
    }

    this.searchStream$.pipe(
      tap(() => {
        this.storageService.selectedPasswords = [];
        this.isSearching = true;
      }),
      distinctUntilChanged(),
      debounceTime(500),
      tap(() => {
        this.searchService.updateSearchResults();

        this.wasSearched = this.searchPhrase.length > 0;
        this.isSearching = false;
      }),
      takeUntil(this.destroyed$)
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddEntryWindow() {
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
