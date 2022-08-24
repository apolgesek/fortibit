import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { GroupIds } from '@app/core/enums';
import { IPasswordGroup } from '@app/core/models';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/managers/storage.service';
import { MenuItem } from '@app/shared';
import { DomUtils } from '@app/utils';
import { IActionMapping, ITreeOptions, KEYS, TreeComponent, TreeModel, TreeNode, TREE_ACTIONS } from '@circlon/angular-tree-component';
import { IPasswordEntry } from '@shared-renderer/index';
import { fromEvent, Observable, Subject, takeUntil } from 'rxjs';

type TreeNodeExtendedEvent = { event: DragEvent, element: HTMLElement };

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
      dragOver: (_: TreeModel, node: TreeNode, $event: TreeNodeExtendedEvent) => {
        const treeNodeContentWrapperClassList = this.getTreeNodeContentWrapper($event.event)?.classList;

        this.storageService.draggedEntries.length === 0 && !$event.element
          ? treeNodeContentWrapperClassList?.add(DomUtils.constants.unknownElementDraggingClass)
          : treeNodeContentWrapperClassList?.remove(DomUtils.constants.unknownElementDraggingClass);
      },
      dragLeave: (_: TreeModel, __: TreeNode, $event: TreeNodeExtendedEvent) => {
        this.getTreeNodeContentWrapper($event.event)?.classList.remove(DomUtils.constants.unknownElementDraggingClass);
      },
      drop: (tree: TreeModel, node: TreeNode, $event: DragEvent, { from, to }) => {
        this.getTreeNodeContentWrapper($event)?.classList
          .remove(DomUtils.constants.unknownElementDraggingClass);

        if (from.data.id === this.groupIds.Starred || from.data.id === this.groupIds.RecycleBin) {
          return;
        }
    
        if (this.storageService.draggedEntries.length) {
          this.storageService.moveEntry(node.data.id);
          this.storageService.draggedEntries = [];
          this.storageService.selectedPasswords = [];
        } else {
          // if dragged element is neither an entry nor group (it could be a file from outside of app)
          if (!from) {
            return;
          }

          if (from.data.id !== to.parent.data.id) {
            this.storageService.moveGroup(from, to);
          }
          
          TREE_ACTIONS.MOVE_NODE(tree, node, $event, { from, to });
        }
      },
      dragStart: (tree: TreeModel, node: TreeNode, $event: DragEvent) => {
        DomUtils.setDragGhost($event);
        this.getTreeNodeContentWrapper($event)?.classList.add('is-dragging');
      },
      dragEnd: (_, __, $event) => {
        this.treeRootElement.getElementsByClassName('is-dragging')[0].classList.remove('is-dragging');
      },
      contextMenu: (_: TreeModel, node: TreeNode) => {
        this.selectGroup({ node });
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
    private readonly storageService: StorageService,
    private readonly searchService: SearchService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.sidebar = this.el.nativeElement;
  }

  get selectedGroup(): TreeNode | undefined {
    return this.storageService.selectedCategory;
  }

  get fileName(): string {
    return this.storageService.databaseFileName;
  }

  get passwordEntries(): IPasswordEntry[] {
    return this.storageService.passwordEntries ?? [];
  }

  get selectedEntries(): IPasswordEntry[] {
    return this.storageService.selectedPasswords;
  }

  get groups(): IPasswordGroup[] {
    return this.storageService.groups;
  }

  get contextSelectedCategory(): TreeNode | undefined {
    return this.storageService.contextSelectedCategory;
  }

  get selectedGroupLabel(): string {
    return this.contextSelectedCategory?.data.name;
  }

  get isGroupRenamed$(): Observable<boolean> {
    return this.storageService.renamedGroup$;
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

    this.storageService.revealInGroup$.pipe(takeUntil(this.destroyed)).subscribe((entry) => {
      this.storageService.selectedPasswords = [ this.storageService.passwordEntries.find(x => x.id === entry.id) ];
      const node: TreeNode = this.tree.treeModel.getNodeById(entry.groupId);

      this.selectGroup({ node }, true);
      node.setActiveAndVisible();
    });
  }

  ngAfterViewInit() {
    const appGroups = [1, GroupIds.Starred, GroupIds.RecycleBin];

    appGroups.forEach(id => {
      const group: TreeNode = this.tree.treeModel.getNodeById(id);

      group.allowDrag = () => false;
    });

    const node: TreeNode = this.tree.treeModel.getNodeById(1);

    if (!this.storageService.file) {
      this.storageService.selectGroup({ node });
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

  selectGroup(event: { node: TreeNode }, reveal = false) {
    this.searchService.isGlobalSearchMode = false;
    this.storageService.selectGroup(event, reveal);

    if (!reveal) {
      this.focusTree();
    }
  }

  collapseGroup(event: { node: TreeNode }) {
    if (event.node.data.name === 'Database') {
      event.node.data.expanded = true;
    }
  }

  getContextMenu(node: TreeNode): MenuItem[] | undefined {
    switch (node.data.id) {
      case 1:
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
    this.storageService.contextSelectedCategory = event.node;
    this.storageService.selectedCategory = event.node;
    this.storageService.updateEntries();
  }

  addGroup() {
    this.storageService.addGroup();
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

    this.storageService.updateGroup(node.data);
    this.storageService.renameGroup(false);

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

  private getTreeNodeContentWrapper(event: DragEvent): HTMLElement | null {
    return (event.target as HTMLElement).closest('.node-content-wrapper');
  }
}
