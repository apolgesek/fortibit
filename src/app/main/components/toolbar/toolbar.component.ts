import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { IpcChannel } from '@shared-renderer/index';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { WorkspaceService, EntryManager, GroupManager } from '@app/core/services';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('searchbox') public searchBox!: ElementRef; 

  public searchModes = [
    { label: 'This group', value: false },
    { label: 'All groups', value: true }
  ];

  private readonly destroyed$ = new Subject<void>();

  get isDatabaseInSync(): boolean {
    return !!this.workspaceService.dateSaved;
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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
  ) {
  }

  ngAfterViewInit(): void {
    this.registerFocusEvent(this.searchBox.nativeElement, 'shadow');
  }

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
      : this.workspaceService.saveDatabase(null);
  }

  toggleSearchMode() {
    this.isGlobalSearchMode = !this.isGlobalSearchMode;
    this.entryManager.updateEntries();
  }

  private registerFocusEvent(element: HTMLElement, className: string) {
    const input = element.querySelector('input') as HTMLInputElement;

    fromEvent(input, 'focus')
      .pipe(
        tap(() => element.classList.add(className)),
        takeUntil(this.destroyed$)
      ).subscribe();

    fromEvent(input, 'blur')
      .pipe(
        tap(() => element.classList.remove(className)),
        takeUntil(this.destroyed$)
      ).subscribe();
  }
}
