import { Component, ElementRef, Inject, NgZone, ViewChild } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { IpcChannel, UpdateState } from '@shared-renderer/index';
import { fromEvent, Observable, Subject } from 'rxjs';
import { scan, startWith, takeUntil, tap } from 'rxjs/operators';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { WorkspaceService, EntryManager, GroupManager } from '@app/core/services';

interface INotification {
  type: 'update';
  content: string;
}

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  @ViewChild('searchbox') public searchBox!: ElementRef; 
  public updateAvailable = '';

  public searchModes = [
    { label: 'This group', value: false },
    { label: 'All groups', value: true }
  ];

  public readonly notifications$: Observable<INotification[]>;
  private readonly notificationsSource = new Subject<INotification>();
  private readonly destroyed$ = new Subject<void>();

  private updateListener: (event: Electron.IpcRendererEvent, state: UpdateState, version: string) => void;

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
    private readonly zone: NgZone
  ) {
    this.notifications$ = this.notificationsSource.asObservable()
      .pipe(
        scan((a, c: INotification) => ([...a, c]), [] as INotification[]),
        startWith([])
      );

    this.updateListener = (_: Electron.IpcRendererEvent, state: UpdateState, version: string) => {
      this.zone.run(() => {
        if (state === UpdateState.Downloaded) {
          this.updateAvailable = version;
          this.notificationsSource.next({ type: 'update', content: version });
        }
      });
    };

    this.communicationService.ipcRenderer.on(IpcChannel.UpdateState, this.updateListener);
  }

  ngAfterViewInit(): void {
    this.registerFocusEvent(this.searchBox.nativeElement, 'shadow');
  }

  ngOnDestroy() {
    this.communicationService.ipcRenderer.off(IpcChannel.UpdateState, this.updateListener);

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

  updateAndRelaunch() {
    this.communicationService.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
  }

  openSettings() {
    this.modalService.openSettingsWindow();
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
