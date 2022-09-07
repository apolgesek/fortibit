import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { GroupIds } from '@app/core/enums';
import { IPasswordGroup } from '@app/core/models';
import { WorkspaceService, EntryManager, GroupManager } from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { SearchService } from '@app/core/services/search.service';
import { MenuItem } from '@app/shared';
import { IActionMapping, ITreeOptions, KEYS, TreeComponent, TreeModel, TreeNode, TREE_ACTIONS } from '@circlon/angular-tree-component';
import { IPasswordEntry } from '@shared-renderer/index';
import { fromEvent, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-groups-sidebar',
  templateUrl: './groups-sidebar.component.html',
  styleUrls: ['./groups-sidebar.component.scss']
})
export class GroupsSidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(TreeComponent) public readonly tree!: TreeComponent;
  @ViewChildren('treeItem') public treeItems: QueryList<ElementRef>;
  public sidebar = { width: 256 };

  public readonly actionMapping: IActionMapping = {
    keys: {
      [KEYS.DOWN]: (tree, node, $event) => {
        if (!this.isTreeFocused()) {
          return;
        }

        TREE_ACTIONS.NEXT_NODE(tree, node, $event);

        setTimeout(() => {
          this.focusSelectedNode();
        });
      },
      [KEYS.UP]: (tree, node, $event) => {
        if (!this.isTreeFocused()) {
          return;
        }

        TREE_ACTIONS.PREVIOUS_NODE(tree, node, $event);
      
        setTimeout(() => {
          this.focusSelectedNode();
        });
      },
    },
    mouse: {
      drop: (tree: TreeModel, node: TreeNode, $event: DragEvent, { from, to }) => {
        if (this.entryManager.draggedEntries.length) {
          this.entryManager.moveEntry(node.data.id);
          this.entryManager.draggedEntries = [];
          this.entryManager.selectedPasswords = [];
        } else {
          // from is null: if dragged element is neither an entry nor group (it could be a file from outside of app)
          // else: if dragging a group to recycle bin or starred items (not allowed)
          if (!from || from.data.id === this.groupIds.Starred || from.data.id === this.groupIds.RecycleBin) {
            return;
          }

          if (from.data.id !== to.parent.data.id) {
            this.groupManager.moveGroup(from.data.id, to.parent.data.id);
          }
          
          TREE_ACTIONS.MOVE_NODE(tree, node, $event, { from, to });
        }
      },
      contextMenu: (_: TreeModel, node: TreeNode) => {
        this.selectGroup(node);
        node.focus(false);
      }     
    }
  };

  public readonly treeOptions: ITreeOptions = {
    allowDrag: true,
    useVirtualScroll: true,
    isExpandedField: 'expanded',
    actionMapping: this.actionMapping
  };

  public readonly treeFocusedClass = 'tree-focused';
  public readonly groupIds = GroupIds;

  public groupContextMenuItems: MenuItem[] = [];
  public groupContextMenuRoot: MenuItem[] = [];
  public groupContextMenuBin: MenuItem[] = [];
  public treeRootElement: HTMLElement | undefined;

  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly searchService: SearchService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.sidebar = this.el.nativeElement;

    this.groupManager.removedGroupSource.subscribe(() => {
      this.onGroupRemoved();
    });

    this.groupManager.addedGroupSource.subscribe(group => {
      this.onGroupAdded(group);
    });
  }

  get selectedGroup(): number {
    return this.groupManager.selectedGroup;
  }

  get fileName(): string {
    return this.workspaceService.databaseFileName;
  }

  get passwordEntries(): IPasswordEntry[] {
    return this.entryManager.passwordEntries ?? [];
  }

  get selectedEntries(): IPasswordEntry[] {
    return this.entryManager.selectedPasswords;
  }

  get groups(): IPasswordGroup[] {
    return this.groupManager.groups;
  }

  get selectedGroupName(): string {
    return this.groupManager.selectedGroupName;
  }

  get isGroupRenamed$(): Observable<boolean> {
    return this.groupManager.renamedGroup$;
  }

  get rootNodeId(): number {
    return this.tree.treeModel.getFirstRoot().data.id;
  }

  async ngOnInit() {
    this.groupContextMenuRoot = this.contextMenuBuilderService
      .buildGroupContextMenuItems({ isRoot: true })
      .getResult();

    this.groupContextMenuItems = this.contextMenuBuilderService
      .buildGroupContextMenuItems()
      .getResult();

    this.groupContextMenuBin = this.contextMenuBuilderService
      .buildEmptyRecycleBinContextMenuItem()
      .getResult();

    this.entryManager.revealInGroup$.pipe(takeUntil(this.destroyed)).subscribe((entry) => {
      this.entryManager.selectedPasswords = [ this.entryManager.passwordEntries.find(x => x.id === entry.id) ];
      const node: TreeNode = this.tree.treeModel.getNodeById(entry.groupId);

      this.selectGroup(node, true);
      node.setActiveAndVisible();
    });
  }

  ngAfterViewInit() {
    const appGroups = [GroupIds.Root, GroupIds.Starred, GroupIds.RecycleBin];

    appGroups.forEach(id => {
      const group: TreeNode = this.tree.treeModel.getNodeById(id);

      group.allowDrag = () => false;
    });

    const node: TreeNode = this.tree.treeModel.getNodeById(GroupIds.Root);

    if (!this.workspaceService.file) {
      this.selectGroup(node);
    }
  
    node.focus(false);
    this.treeRootElement = this.renderer.selectRootElement('tree-root', true);

    // run change detection to prevent expression changed error
    // the only way to make it work due to tree component API
    this.cdRef.detectChanges();
    this.blurTree();

    // can't be handled in tree component key binding map, keydown event is needed for focus handling
    fromEvent(this.treeRootElement, 'keydown')
    .pipe(takeUntil(this.destroyed))
    .subscribe((event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        this.blurTree();
        this.treeItems.forEach(x => x.nativeElement.setAttribute('tabindex', '-1'));
        this.treeRootElement.setAttribute('tabindex', '-1');

        setTimeout(() => {
          this.treeRootElement.setAttribute('tabindex', '0');
          this.treeItems.forEach(x => x.nativeElement.setAttribute('tabindex', '0'));
        });
      }
    });

    this.treeRootElement.addEventListener('focusout', () => {
      this.blurTree();
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  async selectGroup(node: TreeNode, reveal = false): Promise<number> {
    if (!node) {
      return;
    }

    if (this.groupManager.selectedGroup === node.data.id) {
      return node.data.id;
    }

    await this.groupManager.selectGroup(node.data.id);

    if (!reveal) {
      this.entryManager.selectedPasswords = [];
      this.focusTree();
    }

    if (this.groupManager.selectedGroup === GroupIds.Starred) {
      await this.entryManager.setByPredicate((x) => x.isStarred);
    } else {
      await this.entryManager.setByGroup(node.data.id);
    }
  
    this.searchService.reset();
    this.entryManager.updateEntries();
    this.entryManager.reloadEntries();

    return node.data.id;
  }

  collapseGroup(event: { node: TreeNode }) {
    if (event.node.data.id === GroupIds.Root) {
      event.node.data.expanded = true;
    }
  }

  onGroupAdded(group: any) {
    const newGroupNode = {
      id: group.id,
      name: group.name,
      isImported: group.isImported
    };

    const node = this.tree.treeModel.getNodeById(this.selectedGroup);

    if (!node.data.children) {
      node.data.children = [];
    }

    node.data.children.push(newGroupNode);

    this.tree.treeModel.update();
    this.tree.treeModel.getNodeById(newGroupNode.id).ensureVisible();
    this.tree.treeModel.getNodeById(newGroupNode.id).focus();

    this.groupManager.selectedGroup = newGroupNode.id;
  }

  onGroupRemoved() {
    const selectedNode: TreeNode = this.tree.treeModel.getNodeById(this.selectedGroup);
    this.getGroupsRecursive(selectedNode, [this.selectedGroup]);

    selectedNode.parent.data.children.splice(selectedNode.parent.data.children.indexOf(selectedNode.data), 1);
    this.tree.treeModel.update();
    this.tree.treeModel.getNodeById(GroupIds.Root).focus();
  }

  async moveGroup(from: TreeNode, to: TreeNode){
    this.groupManager.moveGroup(from.data.id, to.parent.data.id);
  }

  getContextMenu(node: TreeNode): MenuItem[] | undefined {
    switch (node.data.id) {
      case GroupIds.Root:
        return this.groupContextMenuRoot;
      case GroupIds.Starred:
        return;
      case GroupIds.RecycleBin:
        return this.groupContextMenuBin;
      default:
        return this.groupContextMenuItems;
    }
  }

  setContextMenuGroup(event: { node: TreeNode }) {
    this.groupManager.contextSelectedGroup = event.node.id;
    this.groupManager.selectedGroup = event.node.data.id;
    this.entryManager.updateEntries();
  }

  addGroup() {
    this.groupManager.addGroup();
  }

  collapseAll() {
    this.tree.treeModel.collapseAll();
  }

  trackByTree(_: number, event: { level: number, node: TreeNode }): string {
    return event.node.data.key + '_' + event.level;
  }

  setGroupRenameModeOff(node: TreeNode) {
    if (node.data.name.trim().length === 0) {
      node.data.name = 'New group';
    }

    this.groupManager.updateGroup(node.data);
    this.groupManager.renameGroup(false);

    this.focusTree();
  }

  focusTree() {
    this.tree.treeModel.setFocus(true);
    
    if (this.treeRootElement) {
      this.treeRootElement.classList.add(this.treeFocusedClass);
    }
  }

  blurTree() {
    this.tree.treeModel.setFocus(false);

    if (this.treeRootElement) {
      this.treeRootElement.classList.remove(this.treeFocusedClass);
    }
  }

  private focusSelectedNode(): void {
    this.treeItems
      .toArray()
      .find(x => (x.nativeElement as HTMLElement).classList.contains('node-selected'))
      .nativeElement
      .focus();
  }

  private isTreeFocused(): boolean {
    return document.activeElement.closest('tree-root') !== null;
  }

  private getGroupsRecursive(node: TreeNode, groups: number[]): number[] {
    if (!node.children?.length) {
      return [];
    }

    groups.push(...node.children.map(c => c.id));
    node.children.forEach((child) => {
      const a = this.getGroupsRecursive(child, groups);
      groups.push(...a);
    });

    return [];
  }
}
