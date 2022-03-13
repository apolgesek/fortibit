import { trigger, style, transition, animate } from '@angular/animations';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ClipboardService } from '@app/core/services/clipboard.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/storage.service';
import { MenuItem } from '@app/shared';
import { DomUtils } from '@app/utils';
import { TreeNode } from '@circlon/angular-tree-component';
import { IPasswordEntry } from '@shared-renderer/index';
import { fromEvent, Observable, Subject } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

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

  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private readonly storageService: StorageService,
    private readonly searchService: SearchService,
    private readonly hotkeyService: HotkeyService,
    private readonly clipboardService: ClipboardService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly dialogsService: DialogsService,
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

  ngOnInit() {
    fromEvent(document, 'keydown')
      .pipe(
        filter(x => x instanceof KeyboardEvent),
      ).subscribe(x => {
        if (this.storageService.selectedPasswords.length === 0) {
          return;
        }

        const event = x as KeyboardEvent;
        const selectedPasswordIndex = this.storageService.passwordEntries.indexOf(this.storageService.selectedPasswords[0]);

        switch (event.key) {
        case 'ArrowDown':
          if (selectedPasswordIndex === this.storageService.passwordEntries.length - 1) {
            return;
          }

          this.storageService.selectedPasswords = [this.storageService.passwordEntries[selectedPasswordIndex + 1]];   
          break;
        case 'ArrowUp':
          if (this.storageService.selectedPasswords[0] === this.storageService.passwordEntries[0]) {
            return;
          }

          this.storageService.selectedPasswords = [this.storageService.passwordEntries[selectedPasswordIndex - 1]];
          break; 
        }
      });

    this.multiEntryMenuItems = this.buildMultiEntryMenuItems();
    this.entryMenuItems = this.buildEntryMenuItems();

    this.storageService.reloadedEntriesSource$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.scrollViewport?.scrollTo({ top: 0 });
      });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  trackEntryById(_: number, entry: IPasswordEntry): number {
    return entry.id + (entry.lastModificationDate ? new Date(entry.lastModificationDate).getTime() : 0);
  }

  copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry, value: string) {
    this.clipboardService.copyToClipboard(entry, property, value);
  }

  selectEntry(event: MouseEvent, entry: IPasswordEntry) {
    if (this.hotkeyService.getMultiselectionKey(event) && event.type === 'click') {
      const foundIndex = this.selectedEntries.findIndex(p => p.id === entry.id);
      if (foundIndex > -1) {
        this.selectedEntries.splice(foundIndex, 1);
        return;
      }
      this.selectedEntries.push(entry);
    } else {
      this.storageService.selectedPasswords = [entry];
    }

    (document.querySelector('tree-root') as HTMLElement).classList.remove('focused');
  }

  showEntryContextMenu(event: MouseEvent, item: IPasswordEntry) {
    if (this.selectedEntries.length === 0 || this.selectedEntries.length === 1) {
      this.selectEntry(event, item);
    }
  }

  isEntrySelected(entryData: IPasswordEntry): boolean {
    return this.selectedEntries.filter(e => e.id === entryData.id).length > 0;
  }

  isEntryDragged(entryData: IPasswordEntry): boolean {
    return this.storageService.draggedEntry.filter(e => e === entryData.id).length > 0;
  }

  addNewEntry() {
    this.dialogsService.openEntryWindow();
  }

  startDrag(event: DragEvent, item: IPasswordEntry) {
    this.selectedEntries.length > 0
      ? this.storageService.draggedEntry = this.selectedEntries.map(e => e.id)
      : this.storageService.draggedEntry = [ item.id ];

    DomUtils.setDragGhost(event);
  }

  endDrag() {
    this.storageService.draggedEntry = [];
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