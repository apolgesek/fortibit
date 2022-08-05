import { animate, style, transition, trigger } from '@angular/animations';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { HotkeyHandler } from '@app/app.module';
import { IHotkeyHandler } from '@app/core/models';
import { ConfigService } from '@app/core/services';
import { ClipboardService } from '@app/core/services/clipboard.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/storage.service';
import { MenuItem } from '@app/shared';
import { DomUtils } from '@app/utils';
import { TreeNode } from '@circlon/angular-tree-component';
import { IPasswordEntry } from '@shared-renderer/index';
import { fromEvent, Observable, Subject } from 'rxjs';
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
export class EntriesTableComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(CdkVirtualScrollViewport) public readonly scrollViewport: CdkVirtualScrollViewport | undefined;
  @ViewChildren('rowEntry') public readonly rowEntries: QueryList<ElementRef>;

  public passwordList$: Observable<IPasswordEntry[]>;
  public searchPhrase$: Observable<string>;
  public entryMenuItems: MenuItem[] = [];
  public multiEntryMenuItems: MenuItem[] = [];
  public iconsEnabled: boolean;

  private readonly destroyed$: Subject<void> = new Subject();
  private previousFocusedEntry = null;
  private entryToBeFocusedByMouse: number;

  constructor(
    private readonly el: ElementRef,
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
    return this.storageService.selectedCategory?.data?.id !== Number.MAX_SAFE_INTEGER;
  }

  ngOnInit() {
    this.handleEntriesReload();

    this.multiEntryMenuItems = this.buildMultiEntryMenuItems();
    this.entryMenuItems = this.buildEntryMenuItems();

    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed$)).subscribe((config) => {
      this.iconsEnabled = config.displayIcons;
    });
  }

  ngAfterViewInit() {
    this.handleFocus();
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  trackEntryById(_: number, entry: IPasswordEntry): string {
    return entry.id
      + '_'
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
      this.storageService.selectEntry(entry);

      setTimeout(() => {
        this.rowEntries.find(x => parseInt(x.nativeElement.dataset.id) === this.selectedEntries[0].id).nativeElement.focus();
      });
    }
  }

  // this is used only for keyboard navigqtion to focus the list of entries (first element by default)
  focusFirstElement(index: number) {
    if (!this.previousFocusedEntry && index !== this.entryToBeFocusedByMouse) {
      this.previousFocusedEntry = this.rowEntries.get(index);
      const entry = this.passwordEntries.find(x => x.id === parseInt(this.rowEntries.get(0).nativeElement.dataset.id));

      this.storageService.selectedPasswords = [entry];
      this.storageService.selectEntry(entry);

      this.rowEntries.get(0).nativeElement.focus();
    }

    this.entryToBeFocusedByMouse = undefined;
  }

  // detect whether entry gets focused by explicit mouse click and do not fire focusFirstElement in that case 
  // used the fact that mousedown event takes precedence over focus event
  onMouseDown(index: number) {
    this.previousFocusedEntry = this.rowEntries.get(index);

    this.entryToBeFocusedByMouse = index;
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
    this.modalService.openEntryWindow();
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

  onFocusOut(event, container: CdkVirtualScrollViewport) {
    const tableViewport = container.elementRef.nativeElement;

    if (!tableViewport.contains(event.relatedTarget)) {
      this.previousFocusedEntry = null;
    }
  }

  private handleEntriesReload() {
    this.storageService.reloadedEntries$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.scrollViewport?.scrollTo({ top: 0 });
      });
  }

  private handleFocus() {
    fromEvent(this.el.nativeElement, 'keydown')
      .pipe(
        takeUntil(this.destroyed$)
      ).subscribe((event: KeyboardEvent) => {
        if (this.storageService.selectedPasswords.length === 0) {
          return;
        }
        
        const selectedPasswordIndex = this.rowEntries
          .toArray()
          .indexOf(this.rowEntries.find(x => parseInt(x.nativeElement.dataset.id) === this.selectedEntries[0].id));

        let entryId;
        let entry;

        switch (event.key) {  
          case 'Tab':
            this.handleTabKeydown();
            break;
          case 'ArrowDown':
            if (selectedPasswordIndex === this.rowEntries.length - 1) {
              return;
            }

            entryId = parseInt(this.rowEntries.get(selectedPasswordIndex + 1).nativeElement.dataset.id);
            entry = this.passwordEntries.find(x => x.id === entryId);

            this.storageService.selectedPasswords = [entry];
            this.storageService.selectEntry(entry);

            this.rowEntries.get(selectedPasswordIndex + 1).nativeElement.focus();
            break;
          case 'ArrowUp':
            if (selectedPasswordIndex === 0) {
              return;
            }

            entryId = parseInt(this.rowEntries.get(selectedPasswordIndex - 1).nativeElement.dataset.id);
            entry = this.passwordEntries.find(x => x.id === entryId);

            this.storageService.selectedPasswords = [entry];
            this.storageService.selectEntry(entry);
  
            this.rowEntries.get(selectedPasswordIndex - 1).nativeElement.focus();
            break;
        }
      });
  }

  private handleTabKeydown() {
    if (this.rowEntries.find(x => x.nativeElement === document.activeElement)) {
      this.rowEntries.forEach(x => (x.nativeElement as HTMLElement).setAttribute('tabindex', "-1"));
  
      // navigate outside the list of entries on tab key and restore the ability to navigate on next render
      setTimeout(() => {
        this.rowEntries.forEach(x => (x.nativeElement as HTMLElement).setAttribute('tabindex', "0"));
      });
    }
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