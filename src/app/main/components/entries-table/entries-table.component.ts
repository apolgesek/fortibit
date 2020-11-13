import { Component, Inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { StorageService } from '@app/core/services/storage.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { MenuItem, TreeNode } from 'primeng-lts/api';
import { ContextMenu } from 'primeng-lts/contextmenu';
import { Observable } from 'rxjs';
import { CoreService, DomEventsService, SearchService } from '@app/core/services';
import { DOCUMENT } from '@angular/common';
import { DialogsService } from '@app/core/services/dialogs.service';

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
    private contextMenuBuilderService: ContextMenuBuilderService,
    private domEventsService: DomEventsService,
    private renderer: Renderer2,
    private dialogsService: DialogsService,
    @Inject(DOCUMENT) private document: Document
  ) { 
    this.passwordList$ = this.storageService.entries$;
    this.searchPhrase$ = this.searchService.searchPhrase$;
  }

  ngOnInit() {
    this.storageService.updateEntries();

    this.groupContextMenuItems = this.contextMenuBuilderService
      .buildGroupContextMenuItems()
      .getResult();
    this.multiEntryMenuItems = this.contextMenuBuilderService
      .buildRearrangeEntriesContextMenuItem()
      .buildRemoveEntryContextMenuItem()
      .getResult();
    
    this.entryMenuItems = this.contextMenuBuilderService
      .buildRearrangeEntriesContextMenuItem()
      .buildCopyUsernameEntryContextMenuItem()
      .buildCopyPasswordEntryContextMenuItem()
      .buildSeparator()
      .buildEditEntryContextMenuItem()
      .buildRemoveEntryContextMenuItem()
      .getResult();
  }

  trackEntryById(_: number, entry: PasswordEntry): string {
    return entry.id;
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    this.coreService.copyToClipboard(entry, property);
  }

  selectGroup(event: treeNodeEventObject) {
    this.storageService.selectGroup(event);
    this.document.querySelector('.password-table').scrollTo(0,0);
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

  collapseAll() {
    this.groups[0].children.forEach(c => this.expandRecursive(c, false));
    this.storageService.selectGroup({ node: this.groups[0] });
  }

  addNewEntry() {
    this.dialogsService.openEntryWindow();
  }

  setGroupRenameModeOff() {
    this.storageService.isRenameModeOn = false;
  }

  onDragStart(event: DragEvent, entryData: PasswordEntry) {
    this.selectedEntries.length > 0
      ? this.storageService.draggedEntry = this.selectedEntries
      : this.storageService.draggedEntry = [ entryData ];

    this.domEventsService.createDragGhost(event);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';

    this.document.querySelectorAll('.ui-treenode-selectable *')
      .forEach((el: HTMLElement) => this.renderer.setStyle(el, 'pointerEvents', 'none'));
  }

  onDragEnd() {
    this.domEventsService.removeDragGhost();
    this.document.querySelectorAll('.ui-treenode-selectable *')
      .forEach((el: HTMLElement) => this.renderer.setStyle(el, 'pointerEvents', 'auto'));
    this.storageService.draggedEntry = [];
  }

  private expandRecursive(node:TreeNode, isExpand:boolean) {
    node.expanded = isExpand;
    if (node.children){
      node.children.forEach( childNode => {
        this.expandRecursive(childNode, isExpand);
      } );
    }
  }
}