import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { IPasswordGroup } from '@app/core/models';
import { WorkspaceService, EntryManager, GroupManager, ModalService } from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { SearchService } from '@app/core/services/search.service';
import { MenuItem } from '@app/shared';
import { IPasswordEntry } from '@shared-renderer/index';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-groups-sidebar',
  templateUrl: './groups-sidebar.component.html',
  styleUrls: ['./groups-sidebar.component.scss']
})
export class GroupsSidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly groupIds = GroupId;

  public readonly builtInGroups = [
    { id: GroupId.AllItems, name: 'All entries', icon: 'th-large', parent: null },
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

  async ngAfterViewInit() {
    await this.selectGroup(1);
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  groupTrackFn(group: any): number {
    return group.id;
  }

  onEntryDrop(to: number) {
    this.entryManager.moveEntry(to);
  }

  async selectGroup(id: number, reveal = false): Promise<number> {
    if (!id) {
      return;
    }
    
    await this.entryManager.setByGroup(id);
  
    this.searchService.reset();
    this.entryManager.updateEntries();
    this.entryManager.reloadEntries();

    await this.groupManager.selectGroup(id);

    if (!reveal) {
      this.entryManager.selectedPasswords = [];
    }

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
