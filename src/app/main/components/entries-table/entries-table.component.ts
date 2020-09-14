import { Component, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { StorageService } from '@app/core/services/storage.service';
import { ContextMenuItemsService } from '@app/core/services/context-menu-items.service';
import { MenuItem, TreeNode } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Observable } from 'rxjs';
import { CoreService, SearchService } from '@app/core/services';

type treeNodeEventObject = { node: TreeNode };

@Component({
  selector: 'app-entries-table',
  templateUrl: './entries-table.component.html',
  styleUrls: ['./entries-table.component.scss']
})
export class EntriesTableComponent implements OnInit {
  public passwordList$: Observable<PasswordEntry[]>;
  public searchPhrase$: Observable<string>;

  public groupContextMenuItems: MenuItem[];
  public entryMenuItems: MenuItem[];
  public multiEntryMenuItems: MenuItem[];

  @ViewChild('groupContextMenu') groupContextMenu: ContextMenu;
  @ViewChild('entryContextMenu') entryContextMenu: ContextMenu;

  get selectedEntries(): PasswordEntry[] {
    return this.storageService.selectedPasswords;
  }

  get selectedGroup(): TreeNode {
    return this.storageService.selectedCategory;
  }

  set selectedGroup(treeNode: TreeNode) {
    this.storageService.selectedCategory = treeNode;
  }

  get fileName(): string {
    return this.storageService.databaseFileName;
  }

  get groups(): TreeNode[] {
    return this.storageService.groups;
  }

  get contextSelectedCategory(): TreeNode {
    return this.storageService.contextSelectedCategory;
  }

  get isGroupRenameModeOn(): boolean {
    return this.storageService.isRenameModeOn;
  }

  get selectedGroupLabel(): string {
    return this.contextSelectedCategory?.label;
  }

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private hotkeyService: HotkeyService,
    private coreService: CoreService,
    private contextMenuItemsService: ContextMenuItemsService
  ) { 
    this.passwordList$ = this.storageService.entries$;
    this.searchPhrase$ = this.searchService.searchPhrase$;
  }

  ngOnInit() {
    this.storageService.updateEntries();

    this.groupContextMenuItems = this.contextMenuItemsService.buildGroupContextMenuItems();
    this.multiEntryMenuItems = this.contextMenuItemsService.buildMultiEntryContextMenuItems();
    this.entryMenuItems = this.contextMenuItemsService.buildEntryContextMenuItems();
  }

  trackEntryById(_: number, entry: PasswordEntry): string {
    return entry.id;
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    this.coreService.copyToClipboard(entry, property);
  }

  selectGroup(event: treeNodeEventObject) {
    this.storageService.selectedCategory = event.node;
    this.storageService.selectedCategory.data = event.node.data || [];
    this.storageService.selectedPasswords = [];
    this.searchService.reset();
    this.storageService.updateEntries();
  }

  // prevent "Database" group collapse
  collapseGroup(event: treeNodeEventObject) {
    if (event.node.label === 'Database') {
      event.node.expanded = true;
    }
  }

  selectEntry(event: MouseEvent, password: PasswordEntry) {
    if (this.hotkeyService.getMultiselectionKey(event) && event.type === 'click') {
      const foundIndex = this.storageService.selectedPasswords.findIndex(p => p.id === password.id);
      if (foundIndex > -1) {
        this.storageService.selectedPasswords.splice(foundIndex, 1);
        return;
      }
      this.storageService.selectedPasswords.push(password);
    } else {
      this.storageService.selectedPasswords = [password];
    }
  }

  selectEntryContext(event: any) {
    if (this.storageService.selectedPasswords.length === 0) {
      this.storageService.selectedPasswords = [ event.data ];
    }
  }

  isEntrySelected(entryData: PasswordEntry): boolean {
    return this.storageService.selectedPasswords.filter(e => e.id === entryData.id).length > 0;
  }

  isEntryDragged(entryData: PasswordEntry): boolean {
    return this.storageService.draggedEntry.filter(e => e.id === entryData.id).length > 0;
  }

  setContextMenuGroup(event: treeNodeEventObject) {
    if (event.node.label === 'Database') {
      this.groupContextMenu.hide();
      return;
    }
    this.storageService.contextSelectedCategory = event.node;
    this.storageService.selectedCategory = event.node;
    this.storageService.updateEntries();
  }

  addGroup() {
    this.storageService.addGroup();
  }

  setGroupRenameModeOff() {
    requestAnimationFrame(() => {
      this.storageService.isRenameModeOn = false;
    });
  }

  onDragStart(event: DragEvent, entryData: PasswordEntry) {
    this.selectedEntries.length > 0
      ? this.storageService.draggedEntry = this.selectedEntries
      : this.storageService.draggedEntry = [ entryData ];

    let element = null;
    if (process.platform === 'darwin') {
      element = document.createElement("div");
      element.id = "drag-ghost";
      element.style.position = "absolute";
      element.style.top = "-1000px";
      document.body.appendChild(element);
    } else {
      element = new Image();
      // transparent image
      element.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    }
    event.dataTransfer.setDragImage(element, 0, 0);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'none');
  }

  onDragEnd() {
    if (process.platform === 'darwin') {
      const ghost = document.getElementById("drag-ghost");
      ghost.parentNode.removeChild(ghost);
    }

    document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
    this.storageService.draggedEntry = [];
  }
}