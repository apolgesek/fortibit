import { animate, style, transition, trigger } from '@angular/animations';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GroupId, Sort } from '@app/core/enums';
import { IHotkeyHandler } from '@app/core/models';
import { ConfigService, EntryManager, GroupManager, WorkspaceService } from '@app/core/services';
import { ClipboardService } from '@app/core/services/clipboard.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { EntryIconDirective } from '@app/main/directives/entry-icon.directive';
import { TextEmphasizeDirective } from '@app/main/directives/text-emphasize.directive';
import { DropdownDirective, DropdownMenuDirective, DropdownToggleDirective, MenuItem } from '@app/shared';
import { ContextMenuItemDirective } from '@app/shared/directives/context-menu-item.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { DomUtil } from '@app/utils';
import { IPasswordEntry } from '@shared-renderer/index';
import { HotkeyHandler } from 'injection-tokens';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-entries-table',
  templateUrl: './entries-table.component.html',
  styleUrls: ['./entries-table.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', height: 'auto' }),
        animate('150ms ease-in', style({ transform: 'translateY(0)' })),
      ]),

      transition(':leave', [
        animate('150ms ease-out', style({ transform: 'translateY(-100%)' }))
      ])
    ])
  ],
  standalone: true,
  imports: [
    CommonModule,
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective,
    ScrollingModule,
    TextEmphasizeDirective,
    EntryIconDirective,
    FocusableListDirective,
    FocusableListItemDirective,
    ContextMenuItemDirective
  ]
})
export class EntriesTableComponent implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) public readonly scrollViewport: CdkVirtualScrollViewport | undefined;
  public readonly sortOptions = [
    { name: 'Date added', prop: 'creationDate', state: Sort.Desc },
    { name: 'Title A-Z', prop: 'title', state: Sort.Asc },
    { name: 'Title Z-A', prop: 'title', state: Sort.Desc },
    { name: 'User A-Z', prop: 'username', state: Sort.Asc },
    { name: 'User Z-A', prop: 'username', state: Sort.Desc }
  ];

  public selectedSortOption = this.sortOptions[0];

  public passwordList$: Observable<IPasswordEntry[]>;
  public searchPhrase$: Observable<string>;
  public entryMenuItems: MenuItem[] = [];
  public multiEntryMenuItems: MenuItem[] = [];
  public iconsEnabled: boolean;

  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
    private readonly clipboardService: ClipboardService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly modalService: ModalService,
    @Inject(HotkeyHandler) private readonly hotkeyService: IHotkeyHandler,
  ) { 
    this.passwordList$ = this.entryManager.entries$;
    this.searchPhrase$ = this.searchService.searchPhrase$;
  }

  get selectedEntries(): IPasswordEntry[] {
    return this.entryManager.selectedPasswords;
  }

  get passwordEntries(): IPasswordEntry[] {
    return this.entryManager.passwordEntries ?? [];
  }

  get fileName(): string {
    return this.workspaceService.databaseFileName;
  }

  get searchPhrase(): string {
    return this.searchService.searchPhraseValue;
  }

  get entriesFound$(): Observable<number> {
    return this.entryManager.entries$.pipe(map((entries) => entries.length));
  }

  get isSearching(): boolean {
    return this.searchService.isSearching;
  }

  get wasSearched(): boolean {
    return this.searchService.wasSearched;
  }

  get entriesDragEnabled(): boolean {
    return this.groupManager.selectedGroup !== GroupId.Starred;
  }

  get isAddPossible(): boolean {
    return this.groupManager.isAddAllowed;
  }

  ngOnInit() {
    this.handleEntriesReload();

    this.multiEntryMenuItems = this.buildMultiEntryMenuItems();
    this.entryMenuItems = this.buildEntryMenuItems();

    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed$)).subscribe((config) => {
      this.iconsEnabled = config.displayIcons;
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  trackingTag(_: number, entry: IPasswordEntry): string {
    return entry.id
      + entry.title
      + entry.username
      + entry.password
      + (entry.lastModificationDate ? new Date(entry.lastModificationDate).getTime() : 0)
      + entry.iconPath ?? '';
  }

  copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry) {
    this.clipboardService.copyToClipboard(entry, property);
  }

  selectEntry(event: MouseEvent, entry: IPasswordEntry) {
    if (this.hotkeyService.isMultiselectionKeyDown(event)) {
      const foundIndex = this.selectedEntries.findIndex(p => p.id === entry.id);

      if (foundIndex > -1) {
        this.selectedEntries.splice(foundIndex, 1);
        return;
      }
  
      this.selectedEntries.push(entry);
    } else {
      this.entryManager.selectedPasswords = [entry];
      this.entryManager.selectEntry(entry);
    }
  }

  showEntryContextMenu(event: MouseEvent, item: IPasswordEntry) {    
    if (this.selectedEntries.length === 0 || this.selectedEntries.length === 1) {
      this.selectEntry(event, item);
    }

    event.preventDefault();
  }

  isEntrySelected(entry: IPasswordEntry): boolean {
    return Boolean(this.selectedEntries.find(e => e.id === entry?.id));
  }

  isEntryDragged(entry: IPasswordEntry): boolean {
    return Boolean(this.entryManager.draggedEntries.find(e => e === entry?.id));
  }

  addNewEntry() {
    this.modalService.openNewEntryWindow();
  }

  startDrag(event: DragEvent, item: IPasswordEntry) {
    this.selectedEntries.length > 0
      ? this.entryManager.draggedEntries = this.selectedEntries.map(e => e.id)
      : this.entryManager.draggedEntries = [ item.id ];

    DomUtil.setDragGhost(event);
  }

  endDrag() {
    this.entryManager.draggedEntries = [];
  }

  setSort(option: any) {
    this.selectedSortOption = option;
    this.searchService.setSort(option.state, option.prop);
  }

  private handleEntriesReload() {
    this.entryManager.reloadedEntries$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.scrollViewport?.scrollTo({ top: 0 });
      });
  }

  private buildEntryMenuItems(): MenuItem[] {
    return this.contextMenuBuilderService
      .buildCopyUsernameEntryContextMenuItem()
      .buildCopyPasswordEntryContextMenuItem()
      .buildSeparator()
      .buildEditEntryContextMenuItem()
      .buildRemoveEntryContextMenuItem()
      .getResult();
  }

  private buildMultiEntryMenuItems(): MenuItem[] {
    return this.contextMenuBuilderService
      .buildRemoveEntryContextMenuItem()
      .getResult();
  }
}