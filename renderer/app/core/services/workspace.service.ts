import { Inject, Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { DbManager } from "@app/core/database";
import { EventType as WorkspaceEventType } from "@app/core/enums";
import { ICommunicationService } from "@app/core/models";
import { FileNamePipe } from "@app/shared/pipes/file-name.pipe";
import { IpcChannel } from "@shared-renderer/ipc-channel.enum";
import { IPasswordEntry } from "@shared-renderer/password-entry.model";
import { exportDB, importInto } from "dexie-export-import";
import { CommunicationService } from "injection-tokens";
import { combineLatest, Observable, skip, startWith, Subject } from "rxjs";
import { IAppConfig } from "../../../../app-config";
import { EntryRepository } from "../repositories";
import { ConfigService } from "./config.service";
import { EntryManager } from "./managers/entry.manager";
import { GroupManager } from "./managers/group.manager";
import { ModalService } from "./modal.service";
import { NotificationService } from "./notification.service";

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  public readonly loadedDatabase$: Observable<boolean>;
  
  public isSynced?: boolean;
  public file?: { filePath: string, filename: string };
  public isLocked = true;

  private readonly loadedDatabaseSource: Subject<boolean> = new Subject();
  private config: IAppConfig;

  get databaseFileName(): string {
    return this.file?.filename ?? 'Database (new)';
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
    private readonly entryRepository: EntryRepository,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly db: DbManager,
    private readonly notificationService: NotificationService,
    private readonly modalService: ModalService,
    private readonly fileNamePipe: FileNamePipe,
    private readonly zone: NgZone,
    private readonly router: Router,
  ) {
    this.configService.configLoadedSource$.pipe().subscribe(config => {
      this.config = config as IAppConfig;
    });

    combineLatest([
      this.entryManager.markDirtySource.pipe(startWith(null)),
      this.groupManager.markDirtySource.pipe(startWith(null))
    ]).pipe(skip(1)).subscribe(() => {
      this.isSynced = null;
    });

    this.loadedDatabase$ = this.loadedDatabaseSource.asObservable();

    this.handleDatabaseLock();
    this.handleDatabaseSaved();

    this.communicationService.ipcRenderer.on(IpcChannel.Lock, () => {
      this.zone.run(async () => {
        if (this.config.saveOnLock && this.file) {
          await this.saveDatabase({ notify: false });
          await this.lock({ minimize: true });
        } else {
          this.executeEvent(WorkspaceEventType.Lock);
        }
      });
    });
  }

  async executeEvent(event?: WorkspaceEventType, payload?: unknown): Promise<void> {
    if (this.isSynced) {
      this.execute(event, payload);
      Promise.resolve();
      return;
    } else {
      this.communicationService.ipcRenderer.send(IpcChannel.TryClose, event, payload);
      return this.modalService.openConfirmExitWindow();
    }
  }

  // execute(event?: WorkspaceEventType, payload?: unknown) {
  //   switch (event) {
  //   case WorkspaceEventType.Exit:
  //     this.exitApp();
  //     break;
  //   case WorkspaceEventType.OpenFile:
  //     this.communicationService.ipcRenderer.send(IpcChannel.OpenFile, payload);
  //     break;
  //   case WorkspaceEventType.DropFile:
  //     this.communicationService.ipcRenderer.send(IpcChannel.DropFile, payload);
  //     break;
  //   case WorkspaceEventType.Lock:
  //     this.lock({ minimize: true });
  //     break;
  //   case WorkspaceEventType.Update:
  //     this.communicationService.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
  //   case WorkspaceEventType.NewFile:
  //     this.communicationService.ipcRenderer.invoke(IpcChannel.CreateNew).then(() => this.createNew());
  //   default:
  //     break;
  //   }
  // }

  setDatabaseLoaded(): void {
    this.loadedDatabaseSource.next(true);
  }

  async createNew(): Promise<void> {
    this.groupManager.selectedGroup = null;
    this.entryManager.entryHistory = null;
    this.entryManager.editedEntry = null;
    this.file = null;
    this.isSynced = null;

    this.entryManager.selectedPasswords = [];
    this.entryManager.passwordEntries = [];
    this.groupManager.groups = [];
    this.entryManager.updateEntriesSource();   
    
    await this.db.reset();
    await this.setupDatabase();

    await this.communicationService.ipcRenderer.invoke(IpcChannel.RegenerateKey)
  }

  async lock({ minimize = false }): Promise<void> {
    this.isLocked = true;

    this.groupManager.selectedGroup = null;
    this.entryManager.passwordEntries = [];
    this.groupManager.groups = [];

    await this.db.reset();

    this.communicationService.ipcRenderer.send(IpcChannel.Lock);
    this.router.navigate(['/pass'], { queryParams: { minimize } });
  }

  unlock(): void {
    this.isLocked = false;
    this.communicationService.ipcRenderer.send(IpcChannel.Unlock);
    this.router.navigate(['/workspace']);
  }

  async saveDatabase(config?: { forceNew?: boolean; notify?: boolean }, password?: string): Promise<true | Error> {
    const blob = await exportDB(this.db.context);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = () => {
      this.communicationService.ipcRenderer.send(IpcChannel.SaveFile, { database: fileReader.result, password, config });
    };

    return true;
  }

  async loadDatabase(jsonString: string) {
    const blob = new Blob([jsonString]);

    await importInto(this.db.context, blob, { acceptNameDiff: true, overwriteValues: true });
    await this.groupManager.getGroupsTree();

    this.setDatabaseLoaded();
  }

  async importDatabase(name: string, entries: IPasswordEntry[]): Promise<boolean> {
    try {
      const groupId = await this.groupManager.addGroup({ name, isImported: true });
      const updated = entries.map(e => ({ ...e, groupId }));
      await this.entryManager.bulkAddEntries(updated);
      const entriesWithIds = await this.entryRepository.getAllByGroup(groupId);
      
      for (const entry of entriesWithIds) {
        this.entryManager.getIconPath(entry);
      }
  
      return true;
    } catch (err) {
      return false;
    }
  }

  async clearDatabase(): Promise<void[] | void> {
    this.entryManager.passwordEntries = [];
    return this.db.reset();
  }

  async saveNewDatabase(newPassword: string, config: { forceNew?: boolean }): Promise<true | Error> {
    return this.saveDatabase(config, newPassword);
  }

  async setupDatabase() {
    if (!this.file) {
      await this.groupManager.setupGroups();
    }

    this.setSynced();
    this.setDatabaseLoaded();
  }

  setSynced() {
    this.isSynced = true;
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
        this.file = { filePath: filePath, filename: this.fileNamePipe.transform(filePath) };
        this.lock({ minimize: false });
      });
    });
  }

  private handleDatabaseSaved() {
    this.communicationService.ipcRenderer.on(IpcChannel.GetSaveStatus, (_, { status, error, file, notify }) => {
      this.zone.run(() => {
        if (status) {
          this.file = { filePath: file, filename: this.fileNamePipe.transform(file)};
          this.setSynced();

          if (notify) {
            this.notificationService.add({
              message: 'Database saved',
              alive: 5000,
              type: 'success'
            });
          }
        } else if (error) {
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