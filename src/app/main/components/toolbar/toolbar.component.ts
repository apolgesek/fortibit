import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { HotkeyService, SearchService, StorageService } from '@app/core/services';
import { DialogsService } from '@app/core/services/dialogs.service';
import { fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
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
export class ToolbarComponent {
  @ViewChild('searchbox') public searchBox!: ElementRef; 
  public isSearching = false;
  public wasSearched = false;

  public searchModes = [
    { label: 'This group', value: false },
    { label: 'All groups', value: true }
  ];

  private searchStream$ = new Subject<string>();
  private destroyed$ = new Subject<void>();

  get isDatabaseDirty(): boolean {
    return !!this.storageService.dateSaved;
  }

  get isAnyEntry(): boolean {
    return this.storageService.passwordEntries?.length > 0;
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
    return this.storageService.entries$.pipe(map((entries) => entries.length));
  }

  get searchPhrase(): string {
    return this.searchService.searchPhraseValue;
  }

  set searchPhrase(value: string) {
    this.searchService.searchPhraseValue = value;
    this.searchStream$.next(value);
  }

  get isGlobalSearchMode(): boolean {
    return this.searchService.isGlobalSearchMode;
  }

  set isGlobalSearchMode(value: boolean) {
    this.searchService.isGlobalSearchMode = value;
    this.searchService.updateSearchResults();
  }

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private dialogsService: DialogsService,
    private hotkeyService: HotkeyService,
  ) { }

  ngAfterViewInit(): void {
    this.registerFocusEvent(this.searchBox.nativeElement, 'shadow');

    fromEvent(window, 'keydown')
      .pipe(
        tap((event: Event) => {
          this.hotkeyService.intercept(event as KeyboardEvent);
        }),
        takeUntil(this.destroyed$)
      ).subscribe();

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
    !this.storageService.file
      ? this.dialogsService.openMasterPasswordWindow()
      : this.storageService.saveDatabase();
  }

  toggleSearchMode() {
    this.storageService.isGlobalSearch = !this.storageService.isGlobalSearch;
  }

  private registerFocusEvent(element: HTMLElement, className: string) {
    const input = element.querySelector('input') as HTMLInputElement;

    fromEvent(input, 'focus')
      .pipe(
        tap(() => element.classList.add(className)),
        takeUntil(this.destroyed$)
      ).subscribe();

    fromEvent(input, 'blur')
      .pipe(
        tap(() => element.classList.remove(className)),
        takeUntil(this.destroyed$)
      ).subscribe();
  }
}
