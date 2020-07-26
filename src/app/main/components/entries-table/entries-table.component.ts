import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ElectronService } from '@app/core/services';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { PasswordStoreService } from '@app/core/services/password-store.service';
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
    return this.passwordStore.selectedPasswords;
  }

  get selectedGroup(): TreeNode {
    return this.passwordStore.selectedCategory;
  }

  set selectedGroup(treeNode: TreeNode) {
    this.passwordStore.selectedCategory = treeNode;
  }

  get fileName(): string {
    return this.passwordStore.databaseFileName;
  }

  get groups(): TreeNode[] {
    return this.passwordStore.groups;
  }

  get contextSelectedCategory(): TreeNode {
    return this.passwordStore.contextSelectedCategory;
  }

  get isGroupRenameModeOn(): boolean {
    return this.passwordStore.isRenameModeOn;
  }

  get selectedGroupLabel(): string {
    return this.contextSelectedCategory?.label;
  }

  constructor(
    private zone: NgZone,
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService,
    private hotkeyService: HotkeyService,
    private contextMenuItemsService: ContextMenuItemsService
  ) { 
    this.passwordList$ = this.passwordStore.entries$;
    this.searchPhrase$ = this.passwordStore.searchPhrase$;
  }

  ngOnInit() {
    this.electronService.ipcRenderer.on('onNewEntryAdded', this.newEntryAddedListener);
    this.passwordStore.updateEntries();

    this.groupContextMenuItems = this.contextMenuItemsService.buildGroupContextMenuItems();
    this.multiEntryMenuItems = this.contextMenuItemsService.buildMultiEntryContextMenuItems();
    this.entryMenuItems = this.contextMenuItemsService.buildEntryContextMenuItems();
  }

  ngOnDestroy() {
    this.electronService.ipcRenderer.off('onNewEntryAdded', this.newEntryAddedListener);
  }

  trackEntryById(_: number, entry: PasswordEntry): string {
    return entry.id;
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    this.passwordStore.copyToClipboard(entry, property);
  }

  selectGroup(event: treeNodeEventObject) {
    this.passwordStore.selectedCategory = event.node;
    this.passwordStore.selectedCategory.data = event.node.data || [];
    this.passwordStore.selectedPasswords = [];
    this.passwordStore.resetSearch();
    this.passwordStore.updateEntries();
  }

  // prevent "Database" group collapse
  collapseGroup(event: treeNodeEventObject) {
    if (event.node.label === 'Database') {
      event.node.expanded = true;
    }
  }

  selectEntry(event: MouseEvent, password: PasswordEntry) {
    if (this.hotkeyService.getMultiselectionKey(event) && event.type === 'click') {
      const foundIndex = this.passwordStore.selectedPasswords.findIndex(p => p.id === password.id);
      if (foundIndex > -1) {
        this.passwordStore.selectedPasswords.splice(foundIndex, 1);
        return;
      }
      this.passwordStore.selectedPasswords.push(password);
    } else {
      this.passwordStore.selectedPasswords = [password];
    }
  }

  selectEntryContext(event: any) {
    if (this.passwordStore.selectedPasswords.length === 0) {
      this.passwordStore.selectedPasswords = [ event.data ];
    }
  }

  isEntrySelected(entryData: PasswordEntry): boolean {
    return this.passwordStore.selectedPasswords.filter(e => e.id === entryData.id).length > 0;
  }

  isEntryDragged(entryData: PasswordEntry): boolean {
    return this.passwordStore.draggedEntry.filter(e => e.id === entryData.id).length > 0;
  }

  setContextMenuGroup(event: treeNodeEventObject) {
    if (event.node.label === 'Database') {
      this.groupContextMenu.hide();
      return;
    }
    this.passwordStore.contextSelectedCategory = event.node;
    this.passwordStore.selectedCategory = event.node;
    this.passwordStore.updateEntries();
  }

  addGroup() {
    this.passwordStore.addGroup();
  }

  setGroupRenameModeOff() {
    requestAnimationFrame(() => {
      this.passwordStore.isRenameModeOn = false;
    });
  }

  onDragStart(event: DragEvent, entryData: PasswordEntry) {
    this.selectedEntries.length > 0
      ? this.passwordStore.draggedEntry = this.selectedEntries
      : this.passwordStore.draggedEntry = [ entryData ];

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
    this.passwordStore.draggedEntry = [];
  }

  private newEntryAddedListener: entryAddedElectronEventArgs = (_, newEntryModel: PasswordEntry) => {
    this.zone.run(() => {
      this.passwordStore.addEntry(newEntryModel);
   });
  };
}