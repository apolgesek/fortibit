import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { IPasswordEntry, IPasswordGroup } from '@app/core/models';
import { SearchService, StorageService } from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { DomUtils } from '@app/utils';
import { IActionMapping, ITreeOptions, TreeComponent, TreeModel, TreeNode, TREE_ACTIONS } from '@circlon/angular-tree-component';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Observable } from 'rxjs';

type TreeNodeExtendedEvent = { event: DragEvent, element: HTMLElement };

@Component({
  selector: 'app-groups-sidebar',
  templateUrl: './groups-sidebar.component.html',
  styleUrls: ['./groups-sidebar.component.scss']
})
export class GroupsSidebarComponent implements OnInit, AfterViewInit {
  @ViewChild('groupContextMenu') public readonly groupContextMenu!: ContextMenu;
  @ViewChild(TreeComponent) public readonly tree!: TreeComponent;

  public readonly actionMapping: IActionMapping = {
    mouse: {
      dragOver: (_: TreeModel, __: TreeNode, $event: TreeNodeExtendedEvent) => {
        const treeNodeContentWrapperClassList = this.getTreeNodeContentWrapper($event.event)?.classList;

        this.storageService.draggedEntry.length === 0 && !$event.element
          ? treeNodeContentWrapperClassList?.add(DomUtils.constants.unknownElementDraggingClass)
          : treeNodeContentWrapperClassList?.remove(DomUtils.constants.unknownElementDraggingClass);
      },
      dragLeave: (_: TreeModel, __: TreeNode, $event: TreeNodeExtendedEvent) => {
        this.getTreeNodeContentWrapper($event.event)?.classList.remove(DomUtils.constants.unknownElementDraggingClass);
      },
      drop: (tree: TreeModel, node: TreeNode, $event: DragEvent, {from, to}) => {
        if (this.storageService.draggedEntry.length) {
          this.storageService.moveEntry(node.data.id);
          this.storageService.draggedEntry = [];
        } else {
          // if dragged element is neither an entry nor group (it could be a file from outside of app)
          if (!from) {
            return;
          }

          this.storageService.moveGroup(from, to);
          TREE_ACTIONS.MOVE_NODE(tree, node, $event, {from, to});
        }
      },
      dragStart: (tree: TreeModel, node: TreeNode, $event: DragEvent) => {
        DomUtils.createDragGhost($event);
      },
      click: (_: TreeModel, node: TreeNode) => {
        if (node.isActive) {
          return;
        }

        this.selectGroup({ node });
        node.setIsActive(true);
      },
      contextMenu: (_: TreeModel, node: TreeNode) => {
        this.selectGroup({ node });
        node.setIsActive(true);
      }     
    }
  }

  public readonly treeOptions: ITreeOptions = {
    allowDrag: true,
    useVirtualScroll: true,
    isExpandedField: 'expanded',
    actionMapping: this.actionMapping
  };

  public groupContextMenuItems: MenuItem[] = [];

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
    return this.storageService.renamedGroupSource$;
  }

  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private contextMenuBuilderService: ContextMenuBuilderService,
    private cdRef: ChangeDetectorRef,
  ) { }

  async ngOnInit() {
    this.groupContextMenuItems = this.contextMenuBuilderService
      .buildGroupContextMenuItems()
      .getResult();
  }

  ngAfterViewInit() {
    const node = this.tree.treeModel.getNodeById(1);
    if (!this.storageService.file) {
      this.storageService.selectGroup({ node });
    }
  
    node.setIsActive(true);

    this.cdRef.detectChanges();
  }

  selectGroup(event: { node: TreeNode }) {
    this.searchService.isGlobalSearchMode = false;
    this.storageService.selectGroup(event);
  }

  // prevent "Database" group collapse
  collapseGroup(event: { node: TreeNode }) {
    if (event.node.data.name === 'Database') {
      event.node.data.expanded = true;
    }
  }

  onGroupContextMenuShow() {
    if (this.storageService.selectedCategory?.data.name === 'Database') {
      this.groupContextMenu.model = this.contextMenuBuilderService
        .buildGroupContextMenuItems({ isRoot: true })
        .getResult();
    } else {
      this.groupContextMenu.model = this.groupContextMenuItems;
    }
  }

  setContextMenuGroup(event: { node: TreeNode }) {
    if (event.node.data.name === 'Database') {
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
    this.tree.treeModel.collapseAll();
    this.tree.treeModel.getNodeById(1).setIsActive(true);
    this.tree.treeModel.getNodeById(1).expand();
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
  }

  private getTreeNodeContentWrapper(event: DragEvent): HTMLElement | null {
    return (event.target as HTMLElement).closest('.node-content-wrapper');
  }
}
