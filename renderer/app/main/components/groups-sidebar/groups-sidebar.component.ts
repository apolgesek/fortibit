import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { IPasswordGroup } from '@app/core/models';
import { WorkspaceService, EntryManager, GroupManager, ModalService } from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { SearchService } from '@app/core/services/search.service';
import { DroppableDirective } from '@app/main/directives/droppable.directive';
import { MenuItem } from '@app/shared';
import { ContextMenuItemDirective } from '@app/shared/directives/context-menu-item.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { SidebarHandleDirective } from '@app/shared/directives/sidebar-handle.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { IPasswordEntry } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { Subject } from 'rxjs';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-groups-sidebar',
  templateUrl: './groups-sidebar.component.html',
  styleUrls: ['./groups-sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    FeatherModule,
    ContextMenuItemDirective,
    SidebarHandleDirective,
    DroppableDirective,
    FocusableListDirective,
    FocusableListItemDirective,
    TooltipDirective,
    ToolbarComponent
  ]
})
export class GroupsSidebarComponent implements OnInit, OnDestroy {
  public readonly groupIds = GroupId;

  public readonly builtInGroups = [
    { id: GroupId.AllItems, name: 'All entries', icon: 'grid', parent: null },
    { id: GroupId.Starred, name: 'Favourites', icon: 'star', parent: null },
    { id: GroupId.RecycleBin, name: 'Recycle bin', icon: 'trash', parent: null },
  ];

  public groupContextMenuItems: MenuItem[] = [];
  public groupContextMenuRoot: MenuItem[] = [];
  public groupContextMenuBin: MenuItem[] = [];
  public folderTreeRootElement: HTMLElement | undefined;
  public treeRootElement: HTMLElement | undefined;

  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly searchService: SearchService,
    private readonly contextMenuBuilderService: ContextMenuBuilderService,
    private readonly modalService: ModalService,
  ) {}

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
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  groupTrackFn(group: any): number {
    return group.id;
  }

  async onEntryDrop(to: number): Promise<void> {
    await this.entryManager.moveEntry(to);
  }

  async selectGroup(id: number): Promise<number> {
    if (id === this.selectedGroup) {
      return id;
    }
    
    await this.entryManager.setByGroup(id);
  
    this.searchService.reset();
    this.entryManager.updateEntriesSource();
    this.entryManager.reloadEntries();

    await this.groupManager.selectGroup(id);

    return id;
  }

  getContextMenu(id: number): MenuItem[] | undefined {
    switch (id) {
      case GroupId.Root:
      case GroupId.Starred:
      case GroupId.AllItems:
        return;
      case GroupId.RecycleBin:
        return this.groupContextMenuBin;
      default:
        return this.groupContextMenuItems;
    }
  }

  addGroup() {
    this.modalService.openGroupWindow();
  }
}
