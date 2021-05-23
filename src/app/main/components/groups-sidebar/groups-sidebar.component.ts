import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IPasswordEntry, IPasswordGroup } from '@app/core/models';
import { SearchService, StorageService } from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { DomUtils } from '@app/utils';
import { IActionMapping, TreeComponent, TreeModel, TreeNode, TREE_ACTIONS } from '@circlon/angular-tree-component';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-groups-sidebar',
  templateUrl: './groups-sidebar.component.html',
  styleUrls: ['./groups-sidebar.component.scss']
})
export class GroupsSidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('groupContextMenu') groupContextMenu!: ContextMenu;
  @ViewChild(TreeComponent) tree!: TreeComponent;
  @ViewChild('renameGroupInput') renameGroupInput!: ElementRef;

  public groupContextMenuItems: MenuItem[] = [];

  public actionMapping: IActionMapping = {
    mouse: {
      drop: (tree: TreeModel, node: TreeNode, $event: DragEvent, {from, to}) => {
        if (this.storageService.draggedEntry.length) {
          this.storageService.moveEntry(node.data.id);
          this.storageService.draggedEntry = [];
        } else {
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

  public readonly destroyed$ = new Subject();

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

    this.storageService.renamedGroupSource$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((value: boolean) => {
        setTimeout(() => {
          if (value) {
            this.renameGroupInput.nativeElement.focus();
          }
        });
      });
  }

  ngAfterViewInit() {
    const node = this.tree.treeModel.getNodeById(1);
    if (!this.storageService.file) {
      this.storageService.selectGroup({ node });
    }
  
    node.setIsActive(true);
    this.cdRef.detectChanges();
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
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
}
