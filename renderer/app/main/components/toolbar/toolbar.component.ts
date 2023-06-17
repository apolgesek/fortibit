import { Component, ElementRef, ViewChild } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { WorkspaceService, EntryManager, GroupManager } from '@app/core/services';
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
    TooltipDirective
  ]
})
export class ToolbarComponent {
  @ViewChild('searchInput') public searchInput!: ElementRef;

  public searchModes = [
    { label: 'This group', value: false },
    { label: 'All groups', value: true }
  ];

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly searchService: SearchService,
    private readonly modalService: ModalService,
  ) {}

  get searchMode(): string {
    return this.isGlobalSearchMode ? 'Search all groups' : 'Search selected group';
  }

  get isDatabaseInSync(): boolean {
    return this.workspaceService.isSynced;
  }

  get isAddPossible(): boolean {
    return this.groupManager.isAddAllowed;
  }

  get isAnyEntry(): boolean {
    return this.entryManager.passwordEntries?.length > 0;
  }

  get isOneEntrySelected(): boolean {
    return this.entryManager.selectedPasswords.length === 1;
  }

  get isAnyEntrySelected(): boolean {
    return this.entryManager.selectedPasswords.length > 0;
  }

  get selectedPasswordsCount(): number {
    return this.entryManager.selectedPasswords.length;
  }

  get isGlobalSearchMode(): boolean {
    return this.searchService.isGlobalSearchMode;
  }

  set isGlobalSearchMode(value: boolean) {
    this.searchService.isGlobalSearchMode = value;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  get searchPhrase(): string {
    return this.searchService.searchPhraseValue;
  }

  set searchPhrase(value: string) {
    this.searchService.searchInputSource.next(value);
  }

  openAddEntryWindow() {
    this.modalService.openNewEntryWindow();
  }

  openEditEntryWindow() {
    this.modalService.openEditEntryWindow();
  }

  openDeleteEntryWindow() {
    this.modalService.openDeleteEntryWindow();
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
}
