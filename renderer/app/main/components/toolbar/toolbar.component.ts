import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import {
	WorkspaceService,
	EntryManager,
	GroupManager,
} from '@app/core/services';
import { SettingsButtonComponent } from '../settings-button/settings-button.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { FeatherModule } from 'angular-feather';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';

@Component({
	selector: 'app-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		FeatherModule,
		MenuDirective,
		DropdownDirective,
		DropdownToggleDirective,
		DropdownMenuDirective,
		MenuItemDirective,
		SettingsButtonComponent,
		TooltipDirective,
	],
})
export class ToolbarComponent {
	@ViewChild('searchInput') public searchInput!: ElementRef;

	public searchModes = [
		{ label: 'This group', value: false },
		{ label: 'All groups', value: true },
	];

	private readonly workspaceService = inject(WorkspaceService);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly searchService = inject(SearchService);
	private readonly modalService = inject(ModalService);

	get searchMode(): string {
		return this.isGlobalSearchMode
			? 'Search selected group'
			: 'Search all groups';
	}

	get isDatabaseInSync(): boolean {
		return this.workspaceService.isSynced;
	}

	get isAddPossible(): boolean {
		return this.groupManager.isAddAllowed;
	}

	get isAnyEntry(): boolean {
		return this.entryManager.entries?.length > 0;
	}

	get isOneEntrySelected(): boolean {
		return this.entryManager.selectedEntries.length === 1;
	}

	get isAnyEntrySelected(): boolean {
		return this.entryManager.selectedEntries.length > 0;
	}

	get selectedPasswordsCount(): number {
		return this.entryManager.selectedEntries.length;
	}

	get isGlobalSearchMode(): boolean {
		return this.searchService.isGlobalSearchMode;
	}

	set isGlobalSearchMode(value: boolean) {
		this.searchService.isGlobalSearchMode = value;
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	get searchPhrase(): string {
		return this.searchService.searchInputSource.value;
	}

	set searchPhrase(value: string) {
		this.searchService.searchInputSource.next(value);
	}

	openAddEntryWindow() {
		this.modalService.openNewEntryWindow();
	}

	trySaveDatabase() {
		this.workspaceService.saveDatabase();
	}

	toggleSearchMode() {
		this.isGlobalSearchMode = !this.isGlobalSearchMode;
		this.entryManager.updateEntriesSource();
		(this.searchInput.nativeElement as HTMLInputElement).focus();
	}

	resetSearch() {
		this.searchPhrase = '';
		(this.searchInput.nativeElement as HTMLInputElement).focus();
	}

	handleSearchboxKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			this.entryManager.selectFirstEntry();
		}

		if (!event.ctrlKey) {
			event.stopPropagation();
		}
	}
}
