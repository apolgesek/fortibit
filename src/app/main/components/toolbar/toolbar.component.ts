import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { DialogsService } from '@app/core/services/dialogs.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { SearchService } from '@app/core/services/search.service';
import { StorageService } from '@app/core/services/storage.service';
import { IpcChannel, UpdateState } from '@shared-renderer/index';
import { fromEvent, Observable, Subject } from 'rxjs';
import { scan, startWith, takeUntil, tap } from 'rxjs/operators';

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

  get isDatabasePristine(): boolean {
    return !!this.storageService.dateSaved;
  }

  get isAnyEntry(): boolean {
    return this.storageService.passwordEntries?.length > 0;
  }

  get isOneEntrySelected(): boolean {
    return this.storageService.selectedPasswords.length === 1;
  }

  get isAnyEntrySelected(): boolean {
    return this.storageService.selectedPasswords.length > 0;
  }

  get selectedPasswordsCount(): number {
    return this.storageService.selectedPasswords.length;
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
    private readonly storageService: StorageService,
    private readonly searchService: SearchService,
    private readonly dialogsService: DialogsService,
    private readonly hotkeyService: HotkeyService,
    private readonly electronService: ElectronService,
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

    this.electronService.ipcRenderer.on(IpcChannel.UpdateState, this.updateListener);
  }

  ngAfterViewInit(): void {
    this.registerFocusEvent(this.searchBox.nativeElement, 'shadow');

    fromEvent(window, 'keydown')
      .pipe(
        tap((event: Event) => {
          this.hotkeyService.intercept(event as KeyboardEvent);
        }),
        takeUntil(this.destroyed$)
      ).subscribe();
  }

  ngOnDestroy() {
    this.electronService.ipcRenderer.off(IpcChannel.UpdateState, this.updateListener);

    this.destroyed$.next();
    this.destroyed$.complete();
  }

  openAddEntryWindow() {
    this.dialogsService.openEntryWindow();
  }

  openEditEntryWindow() {
    this.storageService.editedEntry = this.storageService.selectedPasswords[0];
    this.dialogsService.openEntryWindow();
  }

  openDeleteEntryWindow() {
    this.dialogsService.openDeleteEntryWindow();
  }

  trySaveDatabase() {
    !this.storageService.file
      ? this.dialogsService.openMasterPasswordWindow()
      : this.storageService.saveDatabase();
  }

  toggleSearchMode() {
    this.storageService.isGlobalSearch = !this.storageService.isGlobalSearch;
  }

  updateAndRelaunch() {
    this.electronService.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
  }

  openSettings() {
    this.dialogsService.openSettingsWindow();
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
