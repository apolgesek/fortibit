import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { IPasswordGroup } from '@app/core/models';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/storage.service';
import { MenuItem } from '@app/shared';
import { DomUtils } from '@app/utils';
import { IActionMapping, ITreeOptions, TreeComponent, TreeModel, TreeNode, TREE_ACTIONS } from '@circlon/angular-tree-component';
import { IPasswordEntry } from '@shared-renderer/index';
import { fromEvent, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

type TreeNodeExtendedEvent = { event: DragEvent, element: HTMLElement };

@Component({
  selector: 'app-groups-sidebar',
  templateUrl: './groups-sidebar.component.html',
  styleUrls: ['./groups-sidebar.component.scss']
})
export class GroupsSidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(TreeComponent) public readonly tree!: TreeComponent;
  public sidebar = { width: 256 };

  public readonly actionMapping: IActionMapping = {
    mouse: {
      dragOver: (_: TreeModel, __: TreeNode, $event: TreeNodeExtendedEvent) => {
        const treeNodeContentWrapperClassList = this.getTreeNodeContentWrapper($event.event)?.classList;

        this.storageService.draggedEntries.length === 0 && !$event.element
          ? treeNodeContentWrapperClassList?.add(DomUtils.constants.unknownElementDraggingClass)
          : treeNodeContentWrapperClassList?.remove(DomUtils.constants.unknownElementDraggingClass);
      },
      dragLeave: (_: TreeModel, __: TreeNode, $event: TreeNodeExtendedEvent) => {
        this.getTreeNodeContentWrapper($event.event)?.classList.remove(DomUtils.constants.unknownElementDraggingClass);
      },
      drop: (tree: TreeModel, node: TreeNode, $event: DragEvent, {from, to}) => {
        if (this.storageService.draggedEntries.length) {
          this.storageService.moveEntry(node.data.id);
          this.storageService.draggedEntries = [];
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
        DomUtils.setDragGhost($event);
        this.getTreeNodeContentWrapper($event)?.classList.add('is-dragging');
      },
      dragEnd: () => {
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

  public groupContextMenuItems: MenuItem[] = [];
  public groupContextMenuRoot: MenuItem[] = [];

  public treeRootElement: HTMLElement | undefined;

  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly storageService: StorageService,
    private readonly searchService: SearchService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly dialogsService: DialogsService,
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
    return this.storageService.renamedGroupSource$;
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
      
    fromEvent(document, 'click')
      .pipe(takeUntil(this.destroyed))
      .subscribe((event: Event) => {
        (event.target as HTMLElement).closest('.blur-groups') ? this.unfocusTree() : this.focusTree();
      });

    fromEvent(document, 'keydown')
      .pipe(
        filter(x => (x as KeyboardEvent).key === 'Tab'),
        takeUntil(this.destroyed)
      ).subscribe(() => {
        if (this.dialogsService.isAnyDialogOpened) {
          return;
        }

        if (this.tree.treeModel.isFocused && this.storageService.passwordEntries.length) {
          this.unfocusTree();
          this.storageService.selectedPasswords = [this.storageService.passwordEntries[0]];
        } else {
          this.focusTree();
          this.storageService.selectedPasswords = [];
        }
      });
  }

  ngAfterViewInit() {
      const node: TreeNode = this.tree.treeModel.getNodeById(1);
  
      if (!this.storageService.file) {
        this.storageService.selectGroup({ node });
      }
    
      node.focus(false);
      this.treeRootElement = this.renderer.selectRootElement('tree-root', true);

      // run change detection to prevent expression changed error
      // the only way to make it work due to tree component API
      this.cdRef.detectChanges();
  }

  focusTree() {
    this.tree.treeModel.setFocus(true);
    this.renderer.addClass(this.treeRootElement, 'tree-focused');
  }

  unfocusTree() {
    this.tree.treeModel.setFocus(false);
    this.renderer.removeClass(this.treeRootElement, 'tree-focused');
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
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

    const node: TreeNode = this.tree.treeModel.getNodeById(1);
    node.focus(false);
    node.expand();
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
