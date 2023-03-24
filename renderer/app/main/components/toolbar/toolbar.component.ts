import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { Subject } from 'rxjs';
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
    SettingsButtonComponent
  ]
})
export class ToolbarComponent implements OnDestroy {
  @ViewChild('searchInput') public searchInput!: ElementRef; 

  public searchModes = [
    { label: 'This group', value: false },
    { label: 'All groups', value: true }
  ];

  private readonly destroyed$ = new Subject<void>();

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

  get searchPhrase(): string {
    return this.searchService.searchPhraseValue;
  }

  set searchPhrase(value: string) {
    this.searchService.searchInputSource.next(value);
  }

  get isGlobalSearchMode(): boolean {
    return this.searchService.isGlobalSearchMode;
  }

  set isGlobalSearchMode(value: boolean) {
    this.searchService.isGlobalSearchMode = value;
  }

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly searchService: SearchService,
    private readonly modalService: ModalService,
  ) {}

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
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
    !this.workspaceService.file
      ? this.modalService.openMasterPasswordWindow()
      : this.workspaceService.saveDatabase();
  }

  toggleSearchMode() {
    this.isGlobalSearchMode = !this.isGlobalSearchMode;
    this.entryManager.updateEntriesSource();
  }

  resetSearch() {
    this.searchPhrase = '';
    (this.searchInput.nativeElement as HTMLInputElement).focus();
  }
}
