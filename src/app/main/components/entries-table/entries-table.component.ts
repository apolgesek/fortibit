import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IPasswordEntry } from '@app/core/models/password-entry.model';
import { CoreService, SearchService } from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { StorageService } from '@app/core/services/storage.service';
import { DomUtils } from '@app/utils';
import { TreeNode } from '@circlon/angular-tree-component';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-entries-table',
  templateUrl: './entries-table.component.html',
  styleUrls: ['./entries-table.component.scss']
})
export class EntriesTableComponent implements OnInit, OnDestroy {
  @ViewChild('entryContextMenu') public readonly entryContextMenu: ContextMenu | undefined;
  @ViewChild(CdkVirtualScrollViewport) public readonly scrollViewport: CdkVirtualScrollViewport | undefined;

  public passwordList$: Observable<IPasswordEntry[]>;
  public searchPhrase$: Observable<string>;
  public entryMenuItems: MenuItem[] = [];
  public multiEntryMenuItems: MenuItem[] = [];

  private readonly destroyed$: Subject<void> = new Subject();

  get selectedEntries(): IPasswordEntry[] {
    return this.storageService.selectedPasswords;
  }

  set selectedGroup(treeNode: TreeNode) {
    this.storageService.selectedCategory = treeNode;
  }

  get passwordEntries(): IPasswordEntry[] {
    return this.storageService.passwordEntries ?? [];
  }

  get fileName(): string {
    return this.storageService.databaseFileName;
  }

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private hotkeyService: HotkeyService,
    private coreService: CoreService,
    private contextMenuBuilderService: ContextMenuBuilderService,
    private dialogsService: DialogsService,
  ) { 
    this.passwordList$ = this.storageService.entries$;
    this.searchPhrase$ = this.searchService.searchPhrase$;
  }

  ngOnInit() {
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
    this.coreService.copyToClipboard(entry, property, value);
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
  }

  onEntryContextMenuShow() {
    if (!this.entryContextMenu) {
      throw new Error('Context menu instance has not been created!');
    }

    if (this.selectedEntries.length === 0) {
      this.entryContextMenu.model = [];
      this.entryContextMenu.hide();
    } else {
      if (this.selectedEntries.length === 1) {
        this.entryContextMenu.model = this.buildEntryMenuItems();
      } else {
        this.entryContextMenu.model = this.buildMultiEntryMenuItems();
      }

      if (this.searchService.searchPhraseValue.length > 0) {
        (this.entryContextMenu.model.find(x => x.label === 'Rearrange') as MenuItem).disabled = true;
      }
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

  onDragStart(event: DragEvent, entryData: IPasswordEntry) {
    this.selectedEntries.length > 0
      ? this.storageService.draggedEntry = this.selectedEntries.map(e => e.id)
      : this.storageService.draggedEntry = [ entryData.id ];

    DomUtils.createDragGhost(event);
  }

  onDragEnd() {
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