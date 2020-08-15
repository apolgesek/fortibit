import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ElectronService } from '@app/core/services';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { DatabaseService } from '@app/core/services/database.service';
import { ContextMenuItemsService } from '@app/main/services/context-menu-items.service';
import { MenuItem, TreeNode } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Observable } from 'rxjs';

type entryAddedElectronEventArgs = (event: Electron.IpcRendererEvent, ...args: PasswordEntry[]) => void;
type treeNodeEventObject = { node: TreeNode };

@Component({
  selector: 'app-entries-table',
  templateUrl: './entries-table.component.html',
  styleUrls: ['./entries-table.component.scss']
})
export class EntriesTableComponent implements OnInit, OnDestroy {
  public passwordList$: Observable<PasswordEntry[]>;
  public searchPhrase$: Observable<string>;

  public groupContextMenuItems: MenuItem[];
  public entryMenuItems: MenuItem[];
  public multiEntryMenuItems: MenuItem[];

  @ViewChild('groupContextMenu') groupContextMenu: ContextMenu;
  @ViewChild('entryContextMenu') entryContextMenu: ContextMenu;

  get selectedEntries(): PasswordEntry[] {
    return this.databaseService.selectedPasswords;
  }

  get selectedGroup(): TreeNode {
    return this.databaseService.selectedCategory;
  }

  set selectedGroup(treeNode: TreeNode) {
    this.databaseService.selectedCategory = treeNode;
  }

  get fileName(): string {
    return this.databaseService.databaseFileName;
  }

  get groups(): TreeNode[] {
    return this.databaseService.groups;
  }

  get contextSelectedCategory(): TreeNode {
    return this.databaseService.contextSelectedCategory;
  }

  get isGroupRenameModeOn(): boolean {
    return this.databaseService.isRenameModeOn;
  }

  get selectedGroupLabel(): string {
    return this.contextSelectedCategory?.label;
  }

  constructor(
    private zone: NgZone,
    private electronService: ElectronService,
    private databaseService: DatabaseService,
    private hotkeyService: HotkeyService,
    private contextMenuItemsService: ContextMenuItemsService
  ) { 
    this.passwordList$ = this.databaseService.entries$;
    this.searchPhrase$ = this.databaseService.searchPhrase$;
  }

  ngOnInit() {
    this.databaseService.updateEntries();

    this.groupContextMenuItems = this.contextMenuItemsService.buildGroupContextMenuItems();
    this.multiEntryMenuItems = this.contextMenuItemsService.buildMultiEntryContextMenuItems();
    this.entryMenuItems = this.contextMenuItemsService.buildEntryContextMenuItems();
  }

  ngOnDestroy() {
  }

  trackEntryById(_: number, entry: PasswordEntry): string {
    return entry.id;
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    this.databaseService.copyToClipboard(entry, property);
  }

  selectGroup(event: treeNodeEventObject) {
    this.databaseService.selectedCategory = event.node;
    this.databaseService.selectedCategory.data = event.node.data || [];
    this.databaseService.selectedPasswords = [];
    this.databaseService.resetSearch();
    this.databaseService.updateEntries();
  }

  // prevent "Database" group collapse
  collapseGroup(event: treeNodeEventObject) {
    if (event.node.label === 'Database') {
      event.node.expanded = true;
    }
  }

  selectEntry(event: MouseEvent, password: PasswordEntry) {
    if (this.hotkeyService.getMultiselectionKey(event) && event.type === 'click') {
      const foundIndex = this.databaseService.selectedPasswords.findIndex(p => p.id === password.id);
      if (foundIndex > -1) {
        this.databaseService.selectedPasswords.splice(foundIndex, 1);
        return;
      }
      this.databaseService.selectedPasswords.push(password);
    } else {
      this.databaseService.selectedPasswords = [password];
    }
  }

  selectEntryContext(event: any) {
    if (this.databaseService.selectedPasswords.length === 0) {
      this.databaseService.selectedPasswords = [ event.data ];
    }
  }

  isEntrySelected(entryData: PasswordEntry): boolean {
    return this.databaseService.selectedPasswords.filter(e => e.id === entryData.id).length > 0;
  }

  isEntryDragged(entryData: PasswordEntry): boolean {
    return this.databaseService.draggedEntry.filter(e => e.id === entryData.id).length > 0;
  }

  setContextMenuGroup(event: treeNodeEventObject) {
    if (event.node.label === 'Database') {
      this.groupContextMenu.hide();
      return;
    }
    this.databaseService.contextSelectedCategory = event.node;
    this.databaseService.selectedCategory = event.node;
    this.databaseService.updateEntries();
  }

  addGroup() {
    this.databaseService.addGroup();
  }

  setGroupRenameModeOff() {
    requestAnimationFrame(() => {
      this.databaseService.isRenameModeOn = false;
    });
  }

  onDragStart(event: DragEvent, entryData: PasswordEntry) {
    this.selectedEntries.length > 0
      ? this.databaseService.draggedEntry = this.selectedEntries
      : this.databaseService.draggedEntry = [ entryData ];

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
    this.databaseService.draggedEntry = [];
  }
}