import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgClass } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { GroupId } from '@app/core/enums';
import {
	WorkspaceService,
	EntryManager,
	GroupManager,
	ModalService,
} from '@app/core/services';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { SearchService } from '@app/core/services/search.service';
import { DroppableDirective } from '@app/main/directives/droppable.directive';
import { MenuItem } from '@app/shared';
import { ContextMenuItemDirective } from '@app/shared/directives/context-menu-item.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { SidebarHandleComponent } from '@app/shared/components/sidebar-handle/sidebar-handle.component';
import { EntryGroup } from '../../../../../shared/index';
import { FeatherModule } from 'angular-feather';
import { HotkeyHandler } from 'injection-tokens';

@Component({
	selector: 'app-groups-sidebar',
	templateUrl: './groups-sidebar.component.html',
	styleUrls: ['./groups-sidebar.component.scss'],
	standalone: true,
	imports: [
		NgClass,
		ScrollingModule,
		FeatherModule,
		ContextMenuItemDirective,
		SidebarHandleComponent,
		DroppableDirective,
		FocusableListDirective,
		FocusableListItemDirective,
		TooltipDirective
	],
})
export class GroupsSidebarComponent implements OnInit {
	public readonly groupIds = GroupId;

	public readonly builtInGroups = [
		{ id: GroupId.AllItems, name: 'All entries', icon: 'grid', parent: null },
		{ id: GroupId.Starred, name: 'Favourites', icon: 'star', parent: null },
		{
			id: GroupId.RecycleBin,
			name: 'Recycle bin',
			icon: 'trash',
			parent: null,
		},
	];

	public groupContextMenuItems: MenuItem[] = [];
	public groupContextMenuRoot: MenuItem[] = [];
	public groupContextMenuBin: MenuItem[] = [];
	public folderTreeRootElement: HTMLElement | undefined;
	public treeRootElement: HTMLElement | undefined;
	public addGroupLabel = '';

	private readonly workspaceService = inject(WorkspaceService);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly searchService = inject(SearchService);
	private readonly contextMenuBuilderService = inject(ContextMenuBuilderService);
	private readonly modalService = inject(ModalService);
	private readonly hotkeyHandler = inject(HotkeyHandler);

	get selectedGroup(): number {
		return this.groupManager.selectedGroup;
	}

	get fileName(): string {
		return this.workspaceService.databaseFileName;
	}

	get groups(): EntryGroup[] {
		return this.groupManager.groups;
	}

	ngOnInit() {
		this.addGroupLabel = this.hotkeyHandler.getContextMenuLabel('AddGroup');
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

	groupTrackFn(_: number, group: EntryGroup) {
		return group.id;
	}

	async onEntryDrop(to: number): Promise<void> {
		await this.entryManager.moveEntry(to);
	}

	async selectGroup(id: number): Promise<number> {
		await this.entryManager.setByGroup(id);
		this.searchService.reset();
		this.entryManager.updateEntriesSource();
		this.entryManager.reloadEntries();

		await this.groupManager.selectGroup(id);
		await this.entryManager.selectEntry();

		return id;
	}

	getContextMenu(id: number): MenuItem[] {
		switch (id) {
			case GroupId.Starred:
			case GroupId.AllItems:
				return [];
			case GroupId.RecycleBin:
				return this.groupContextMenuBin;
			case GroupId.Root:
				return this.groupContextMenuRoot;
			default:
				return this.groupContextMenuItems;
		}
	}

	addGroup() {
		this.modalService.openGroupWindow();
	}

	editGroup() {
		this.modalService.openGroupWindow('edit');
	}
}
