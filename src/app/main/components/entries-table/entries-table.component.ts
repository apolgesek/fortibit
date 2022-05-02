import { trigger, style, transition, animate } from '@angular/animations';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
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
import { HotkeyHandler } from '@app/app.module';
import { IHotkeyHandler, IPasswordGroup } from '@app/core/models';

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

  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private readonly storageService: StorageService,
    private readonly searchService: SearchService,
    private readonly clipboardService: ClipboardService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly modalService: ModalService,
    private readonly el: ElementRef,
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
  }

  ngAfterViewInit() {
    this.handleFocus();
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  trackEntryById(_: number, entry: IPasswordEntry): number {
    return entry.id + (entry.lastModificationDate ? new Date(entry.lastModificationDate).getTime() : 0);
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
        this.rowEntries.find(x => x.nativeElement.classList.contains('selected')).nativeElement.focus();
      });
    }
  }

  showEntryContextMenu(event: MouseEvent, item: IPasswordEntry) {
    if (this.selectedEntries.length === 0 || this.selectedEntries.length === 1) {
      this.selectEntry(event, item);
    }
  }

  isEntrySelected(entry: IPasswordEntry): boolean {
    return this.selectedEntries.filter(e => e.id === entry.id).length > 0;
  }

  isEntryDragged(entry: IPasswordEntry): boolean {
    return this.storageService.draggedEntries.filter(e => e === entry.id).length > 0;
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
        
        const selectedPasswordIndex = this.storageService.passwordEntries.indexOf(this.storageService.selectedPasswords[0]);

        switch (event.key) {
          case 'Tab':
            this.handleTabKeydown();
            break;
          case 'ArrowDown':
            if (selectedPasswordIndex === this.storageService.passwordEntries.length - 1) {
              return;
            }

            this.storageService.selectedPasswords = [this.storageService.passwordEntries[selectedPasswordIndex + 1]];

            setTimeout(() => {
              this.rowEntries.find(x => x.nativeElement.classList.contains('selected')).nativeElement.focus();
            });
            break;
          case 'ArrowUp':
            if (this.storageService.selectedPasswords[0] === this.storageService.passwordEntries[0]) {
              return;
            }

            this.storageService.selectedPasswords = [this.storageService.passwordEntries[selectedPasswordIndex - 1]];

            setTimeout(() => {
              this.rowEntries.find(x => x.nativeElement.classList.contains('selected')).nativeElement.focus();
            });
            break;
        }
      });
  }

  private handleTabKeydown() {
    if (this.rowEntries.find(x => x.nativeElement === document.activeElement)) {
      this.rowEntries.forEach(x => (x.nativeElement as HTMLElement).setAttribute('tabindex', "-1"));
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