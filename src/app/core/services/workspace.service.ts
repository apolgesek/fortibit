import { Inject, Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { CommunicationService } from "@app/app.module";
import { DbContext } from "@app/core/database";
import { EventType } from "@app/core/enums";
import { ICommunicationService } from "@app/core/models";
import { IpcChannel } from "@shared-renderer/ipc-channel.enum";
import { IPasswordEntry } from "@shared-renderer/password-entry.model";
import { exportDB, importInto } from "dexie-export-import";
import { combineLatest, Observable, skip, startWith, Subject } from "rxjs";
import { EntryManager } from "./managers/entry.manager";
import { GroupManager } from "./managers/group.manager";
import { NotificationService } from "./notification.service";

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  public readonly loadedDatabase$: Observable<boolean>;

  public dateSaved?: Date;
  public file?: { filePath: string, filename: string };
  public isLocked = true;

  private readonly loadedDatabaseSource: Subject<boolean> = new Subject();

  get databaseFileName(): string {
    return this.file?.filename ?? 'New db (unsaved)';
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly dbContext: DbContext,
    private readonly notificationService: NotificationService,
    private readonly zone: NgZone,
    private readonly router: Router,
  ) {
    this.entryManager.markDirtySource = new Subject();
    this.groupManager.markDirtySource = new Subject();

    combineLatest([
      this.entryManager.markDirtySource.pipe(startWith(null)),
      this.groupManager.markDirtySource.pipe(startWith(null))
    ]).pipe(skip(1)).subscribe(() => {
      this.dateSaved = null;
    });

    this.loadedDatabase$ = this.loadedDatabaseSource.asObservable();

    this.handleDatabaseLock();
    this.handleDatabaseSaved();

    this.communicationService.ipcRenderer.on(IpcChannel.Lock, () => {
      this.zone.run(() => {
        this.checkFileSaved(EventType.Lock);
      });
    });
  }

  checkFileSaved(event?: EventType, payload?: unknown): void {
    if (this.dateSaved) {
      this.execute(event, payload);
      return;
    }

    this.communicationService.ipcRenderer.send(IpcChannel.TryClose, event, payload);
  }

  execute(event?: EventType, payload?: unknown) {
    switch (event) {
    case EventType.Exit:
      this.exitApp();
      break;
    case EventType.OpenFile:
      this.communicationService.ipcRenderer.send(IpcChannel.OpenFile);
      break;
    case EventType.DropFile:
      this.communicationService.ipcRenderer.send(IpcChannel.DropFile, payload);
      break;
    case EventType.Lock:
      this.lock({ minimize: true });
    default:
      break;
    }
  }

  setDatabaseLoaded(): void {
    this.loadedDatabaseSource.next(true);
  }

  async createNew(): Promise<void> {
    this.groupManager.selectedGroup = null;
    this.entryManager.entryHistory = null;
    this.entryManager.editedEntry = null;
    this.file = null;
    this.dateSaved = null;

    this.entryManager.selectedPasswords = [];
    this.entryManager.passwordEntries = [];
    this.groupManager.groups = [];    
    
    await this.dbContext.resetDb();
    await this.setupDatabase();
  }

  async lock({ minimize = false }): Promise<void> {
    this.isLocked = true;

    this.groupManager.selectedGroup = null;
    this.entryManager.passwordEntries = [];
    this.groupManager.groups = [];
    
    await this.dbContext.resetDb();

    this.communicationService.ipcRenderer.send(IpcChannel.Lock);
    this.router.navigate(['/pass'], { queryParams: { minimize } });
  }

  unlock(): void {
    this.isLocked = false;
    this.communicationService.ipcRenderer.send(IpcChannel.Unlock);
    this.router.navigate(['/workspace']);
  }

  async saveDatabase(newPassword?: string, config?: { forceNew?: boolean }): Promise<true | Error> {
    const blob = await exportDB(this.dbContext);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = () => {
      this.communicationService.ipcRenderer.send(IpcChannel.SaveFile, { database: fileReader.result, newPassword, config });
    };

    return true;
  }

  async loadDatabase(jsonString: string) {
    const blob = new Blob([jsonString]);

    await importInto(this.dbContext, blob);

    this.groupManager.groups = await this.groupManager.getGroupsTree();
    this.setDatabaseLoaded();
  }

  async importDatabase(name: string, entries: IPasswordEntry[]): Promise<number> {
    const groupId = await this.groupManager.addGroup({ name, isImported: true });
    const updated = entries.map(e => ({ ...e, groupId }));

    return this.entryManager.bulkAddEntries(updated);
  }

  async clearDatabase() {
    await this.dbContext.resetDb();
    this.entryManager.passwordEntries = [];
  }

  async saveNewDatabase(newPassword: string, config: { forceNew?: boolean }): Promise<true | Error> {
    return this.saveDatabase(newPassword, config);
  }

  async setupDatabase() {
    await this.groupManager.setupGroups();

    this.setDateSaved();
    this.setDatabaseLoaded();
  }

  setDateSaved() {
    this.dateSaved = new Date();
  }

  private exitApp() {
    window.onbeforeunload = null;

    setTimeout(() => {
      this.communicationService.ipcRenderer.send(IpcChannel.Exit);
    });
  }

  private handleDatabaseLock() {
    this.communicationService.ipcRenderer.on(IpcChannel.ProvidePassword, (_, filePath: string) => {
      this.zone.run(() => {
        this.file = { filePath: filePath, filename: filePath.split('\\').slice(-1)[0] };
        this.lock({ minimize: false });
      });
    });
  }

  private handleDatabaseSaved() {
    this.communicationService.ipcRenderer.on(IpcChannel.GetSaveStatus, (_, { status, message, file }) => {
      this.zone.run(() => {
        if (status) {
          this.file = { filePath: file, filename: file.split('\\').splice(-1)[0] };

          this.setDateSaved();

          this.notificationService.add({
            message: 'Database saved',
            alive: 5000,
            type: 'success'
          });
        } else if (message) {
          this.notificationService.add({
            type: 'error',
            message: 'Error occured',
            alive: 5000,
          });
        }
      });
    });
  }
}