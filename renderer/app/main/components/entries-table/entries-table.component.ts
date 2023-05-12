import { animate, style, transition, trigger } from '@angular/animations';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { IHotkeyHandler } from '@app/core/models';
import { ConfigService, EntryManager, GroupManager, WorkspaceService } from '@app/core/services';
import { ClipboardService } from '@app/core/services/clipboard.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { EntryIconDirective } from '@app/main/directives/entry-icon.directive';
import { TextEmphasizeDirective } from '@app/main/directives/text-emphasize.directive';
import { MenuItem, slideDown } from '@app/shared';
import { ContextMenuItemDirective } from '@app/shared/directives/context-menu-item.directive';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { UiUtil } from '@app/utils';
import { IPasswordEntry } from '@shared-renderer/index';
import { HotkeyHandler } from 'injection-tokens';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { TableFiltersComponent } from '../table-filters/table-filters.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';

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
    ]),
    slideDown
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
    ContextMenuItemDirective,
    TooltipDirective,
    ToolbarComponent,
    TableFiltersComponent,
  ]
})
export class EntriesTableComponent implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) public readonly scrollViewport: CdkVirtualScrollViewport | undefined;

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

  get activeFilters(): string[] {
    return [];
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
      + entry.icon ?? '';
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
    event.preventDefault();

    if (this.selectedEntries.length === 0 || this.selectedEntries.length === 1) {
      this.selectEntry(event, item);
    }
  }

  isEntrySelected(entry: IPasswordEntry): boolean {
    return Boolean(this.selectedEntries.find(e => e.id === entry?.id));
  }

  isEntryDragged(entry: IPasswordEntry): boolean {
    return Boolean(this.entryManager.movedEntries.find(e => e === entry?.id));
  }

  addNewEntry() {
    this.modalService.openNewEntryWindow();
  }

  startDrag(event: DragEvent, item: IPasswordEntry) {
    this.selectedEntries.length > 0
      ? this.entryManager.movedEntries = this.selectedEntries.map(e => e.id)
      : this.entryManager.movedEntries = [ item.id ];

    UiUtil.setDragGhost(event);
  }

  endDrag() {
    this.entryManager.movedEntries = [];
  }

  getContextMenu(entry: IPasswordEntry): MenuItem[] {
    if (this.selectedEntries.length === 1) {
      return this.entryMenuItems;
     } else {
      return this.multiEntryMenuItems;
     } 
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
      .buildMoveEntryContextMenuItem()
      .buildRemoveEntryContextMenuItem()
      .getResult();
  }

  private buildMultiEntryMenuItems(): MenuItem[] {
    return this.contextMenuBuilderService
      .buildRemoveEntryContextMenuItem()
      .buildMoveEntryContextMenuItem()
      .getResult();
  }
}