import { animate, style, transition, trigger } from '@angular/animations';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HotkeyHandler } from '@app/app.module';
import { GroupIds } from '@app/core/enums';
import { IHotkeyHandler } from '@app/core/models';
import { ConfigService } from '@app/core/services';
import { ClipboardService } from '@app/core/services/clipboard.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/managers/storage.service';
import { MenuItem } from '@app/shared';
import { DomUtils } from '@app/utils';
import { TreeNode } from '@circlon/angular-tree-component';
import { IPasswordEntry } from '@shared-renderer/index';
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
    private readonly storageService: StorageService,
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
    private readonly clipboardService: ClipboardService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly modalService: ModalService,
    @Inject(HotkeyHandler) private readonly hotkeyService: IHotkeyHandler,
  ) { 
    this.passwordList$ = this.storageService.entries$;
    this.searchPhrase$ = this.searchService.searchPhrase$;
  }

  get selectedEntries(): IPasswordEntry[] {
    return this.storageService.selectedPasswords;
  }

  get passwordEntries(): IPasswordEntry[] {
    return this.storageService.passwordEntries ?? [];
  }

  get fileName(): string {
    return this.storageService.databaseFileName;
  }

  set selectedGroup(treeNode: TreeNode) {
    this.storageService.selectedCategory = treeNode;
  }

  get searchPhrase(): string {
    return this.searchService.searchPhraseValue;
  }

  get entriesFound$(): Observable<number> {
    return this.storageService.entries$.pipe(map((entries) => entries.length));
  }

  get isSearching(): boolean {
    return this.searchService.isSearching;
  }

  get wasSearched(): boolean {
    return this.searchService.wasSearched;
  }

  get entriesDragEnabled(): boolean {
    return this.storageService.selectedCategory?.data?.id !== GroupIds.Starred;
  }

  get isAddPossible(): boolean {
    return this.storageService.isAddPossible;
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
      this.storageService.selectedPasswords = [entry];
      this.storageService.selectEntry(entry);;
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
    return Boolean(this.storageService.draggedEntries.find(e => e === entry?.id));
  }

  addNewEntry() {
    this.modalService.openNewEntryWindow();
  }

  startDrag(event: DragEvent, item: IPasswordEntry) {
    this.selectedEntries.length > 0
      ? this.storageService.draggedEntries = this.selectedEntries.map(e => e.id)
      : this.storageService.draggedEntries = [ item.id ];

    DomUtils.setDragGhost(event);
  }

  endDrag() {
    this.storageService.draggedEntries = [];
  }

  private handleEntriesReload() {
    this.storageService.reloadedEntries$
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