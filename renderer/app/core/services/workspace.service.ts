import { Inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { DbManager } from '@app/core/database';
import { IMessageBroker } from '@app/core/models';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { IPasswordEntry } from '@shared-renderer/password-entry.model';
import { exportDB, importInto } from 'dexie-export-import';
import { MessageBroker } from 'injection-tokens';
import { combineLatest, Observable, skip, startWith, Subject } from 'rxjs';
import { IAppConfig } from '../../../../app-config';
import { ConfigService } from './config.service';
import { EntryManager } from './managers/entry.manager';
import { GroupManager } from './managers/group.manager';
import { ModalService } from './modal.service';
import { NotificationService } from './notification.service';
import { UiUtil } from '@app/utils';
import { HistoryManager } from './managers/history.manager';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  public readonly loadedDatabase$: Observable<boolean>;
  public isSynced?: boolean;
  public file?: { filePath: string; filename: string };
  public isLocked = true;
  public isBiometricsAuthenticationInProgress = false;
  private config: IAppConfig;
  private readonly loadedDatabaseSource: Subject<boolean> = new Subject();

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly configService: ConfigService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly historyManager: HistoryManager,
    private readonly dbManager: DbManager,
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
      this.groupManager.markDirtySource.pipe(startWith(null)),
      this.historyManager.markDirtySource.pipe(startWith(null))
    ]).pipe(skip(1)).subscribe(() => {
      this.isSynced = null;
      this.saveDatabaseSnapshot();
    });

    this.loadedDatabase$ = this.loadedDatabaseSource.asObservable();

    this.handleDatabaseLock();
    this.handleDatabaseSaved();

    this.messageBroker.ipcRenderer.on(IpcChannel.Lock, () => {
      this.zone.run(async () => {
        if (this.config.saveOnLock && this.file) {
          await this.saveDatabase({ notify: false });
          await this.lock({ minimize: true });
        } else {
          const success = await this.executeEvent();
          if (success) {
            this.lock({ minimize: true });
          }
        }
      });
    });
  }

  get databaseFileName(): string {
    return this.file?.filename ?? 'Database (new)';
  }

  async executeEvent(): Promise<boolean> {
    if (this.isSynced) {
      return Promise.resolve(true);
    } else {
      this.messageBroker.ipcRenderer.send(IpcChannel.TryClose);
      return this.modalService.openConfirmExitWindow();
    }
  }

  setDatabaseLoaded(): void {
    this.loadedDatabaseSource.next(true);
  }

  async createNew(): Promise<void> {
    await this.router.navigate(['/master-password']);

    this.groupManager.selectedGroup = null;
    this.entryManager.entryHistory = null;
    this.entryManager.editedEntry = null;
    this.file = null;
    this.isSynced = null;

    this.entryManager.selectedPasswords = [];
    this.entryManager.passwordEntries = [];
    this.groupManager.groups = [];
    this.entryManager.updateEntriesSource();

    await this.dbManager.reset();
    await this.setupDatabase();
  }

  async lock({ minimize = false }): Promise<void> {
    this.isLocked = true;

    this.groupManager.selectedGroup = null;
    this.groupManager.groups = [];
    this.entryManager.passwordEntries = [];
    this.entryManager.updateEntriesSource();

    await this.dbManager.reset();

    this.messageBroker.ipcRenderer.send(IpcChannel.Lock);
    this.router.navigate(['/pass'], { queryParams: { minimize } });
  }

  async unlock(): Promise<void> {
    this.isLocked = false;
    this.messageBroker.ipcRenderer.send(IpcChannel.Unlock);

    await this.router.navigate(['/workspace']);

    UiUtil.unlockInterface();
    this.isBiometricsAuthenticationInProgress = false;

    const path = await this.messageBroker.ipcRenderer.invoke(IpcChannel.CheckRecoveryFile);
    if (path) {
      setTimeout(() => {
        this.modalService.openRecoveryWindow(path);
      }, 1000);
    }
  }

  async saveDatabase(config?: { forceNew?: boolean; notify?: boolean }, password?: string): Promise<true | Error> {
    const blob = await exportDB(this.dbManager.context);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = () => {
      this.messageBroker.ipcRenderer.send(IpcChannel.SaveFile, {
        database: fileReader.result,
        password,
        config
      });
    };

    return true;
  }

  async saveDatabaseSnapshot(): Promise<true | Error> {
    const blob = await exportDB(this.dbManager.context);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = () => {
      this.messageBroker.ipcRenderer.send(IpcChannel.DatabaseChanged, { database: fileReader.result });
    };

    return true;
  }

  async loadDatabase(jsonString: string) {
    const blob = new Blob([jsonString]);

    await importInto(this.dbManager.context, blob, {
      acceptNameDiff: true,
      acceptVersionDiff: true,
      overwriteValues: true,
      clearTablesBeforeImport: true
    });
    await this.groupManager.getGroupsTree();

    this.setDatabaseLoaded();
  }

  async importDatabase(name: string, entries: IPasswordEntry[]): Promise<boolean> {
    try {
      const groupId = await this.groupManager.addGroup({ name, isImported: true });
      const updated = entries.map(e => ({ ...e, groupId }));
      await this.entryManager.bulkAddEntries(updated);
      const entriesWithIds = await this.entryManager.getAllByGroup(groupId);

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
    return this.dbManager.reset();
  }

  async saveNewDatabase(newPassword: string, config: { forceNew?: boolean }): Promise<true | Error> {
    return this.saveDatabase(config, newPassword);
  }

  async setupDatabase() {
    await this.messageBroker.ipcRenderer.invoke(IpcChannel.RegenerateKey);

    if (!this.file) {
      await this.groupManager.setupGroups();
    }

    this.setSynced();
    this.setDatabaseLoaded();
  }

  setSynced() {
    this.isSynced = true;
  }

  exitApp() {
    window.onbeforeunload = null;

    setTimeout(() => {
      this.messageBroker.ipcRenderer.send(IpcChannel.Exit);
    });
  }

  toggleTheme() {
    this.messageBroker.ipcRenderer.invoke(IpcChannel.ToggleTheme);
  }

  private readonly lockKeydownEvent = (event: KeyboardEvent) => event.preventDefault();

  private handleDatabaseLock() {
    this.messageBroker.ipcRenderer.on(IpcChannel.ProvidePassword, (_, filePath: string) => {
      this.zone.run(() => {
        this.file = { filePath, filename: this.fileNamePipe.transform(filePath) };
        this.lock({ minimize: false });
      });
    });
  }

  private handleDatabaseSaved() {
    this.messageBroker.ipcRenderer.on(IpcChannel.GetSaveStatus, (_, { status, error, file, notify }) => {
      this.zone.run(() => {
        if (status) {
          this.file = { filePath: file, filename: this.fileNamePipe.transform(file)};
          this.setSynced();

          if (notify) {
            this.notificationService.add({
              message: 'Database saved',
              alive: 10 * 1000,
              type: 'success'
            });
          }
        } else if (error) {
          this.notificationService.add({
            type: 'error',
            message: 'Error occured',
            alive: 10 * 1000,
          });
        }
      });
    });
  }
}
