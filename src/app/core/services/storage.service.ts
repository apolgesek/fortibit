import { Inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { markDirty } from '@app/core/decorators/mark-dirty.decorator';
import { ICommunicationService, IPasswordGroup } from '@app/core/models';
import { EntryRepository, GroupRepository, ReportRepository } from '@app/core/repositories';
import { SearchService } from '@app/core/services/search.service';
import { TreeNode } from '@circlon/angular-tree-component';
import { IPasswordEntry, IpcChannel, IReport } from '@shared-renderer/index';
import { AppConfig } from 'environments/environment';
import { BehaviorSubject, combineLatest, from, Observable, of, Subject } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { DbContext, initialEntries } from '../database';
import { EventType, Sort } from '../enums';
import { NotificationService } from './notification.service';
import { exportDB, importInto } from "dexie-export-import";
import { CommunicationService } from '@app/app.module';

interface SearchResultsModel {
  passwords: IPasswordEntry[],
  searchPhrase: string,
  searchResults: IPasswordEntry[]
}

type GetSearchResultsModel = [passwords: IPasswordEntry[], searchPhrase: string];

@Injectable({ providedIn: 'root' })
export class StorageService {
  public readonly entries$: Observable<IPasswordEntry[]>;
  public readonly renamedGroup$: Observable<boolean>;
  public readonly loadedDatabase$: Observable<boolean>;
  public readonly reloadedEntries$: Observable<void>;
  public readonly revealInGroup$: Observable<IPasswordEntry>;
  public readonly selectEntry$: Observable<IPasswordEntry>;

  public draggedEntries: number[] = [];
  public groups: IPasswordGroup[] = [];

  public dateSaved?: Date;
  public editedEntry?: IPasswordEntry;
  public selectedCategory?: TreeNode;
  public contextSelectedCategory?: TreeNode;
  public file?: { filePath: string, filename: string };
  public isLocked = true;

  public passwordEntries: IPasswordEntry[] = [];
  public selectedPasswords: IPasswordEntry[] = [];
  
  private readonly loadedDatabaseSource: Subject<boolean> = new Subject();
  private readonly reloadedEntriesSource: Subject<void> = new Subject();
  private readonly renamedGroupSource: Subject<boolean> = new Subject();
  private readonly revealedInGroupSource: Subject<IPasswordEntry> = new Subject();
  private readonly entrySelectedSource: Subject<IPasswordEntry> = new Subject();

  private readonly passwordListSource$: BehaviorSubject<IPasswordEntry[]> = new BehaviorSubject<IPasswordEntry[]>([]);

  get isGlobalSearch(): boolean {
    return this.searchService.isGlobalSearchMode;
  }

  set isGlobalSearch(value: boolean) {
    this.searchService.isGlobalSearchMode = value;
  }

  get databaseFileName(): string {
    return this.file?.filename ?? 'New db (unsaved)';
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly searchService: SearchService,
    private readonly notificationService: NotificationService,
    private readonly entryRepository: EntryRepository,
    private readonly groupRepository: GroupRepository,
    private readonly reportRepository: ReportRepository,
    private readonly dbContext: DbContext,
  ) {
    this.entries$ = combineLatest([
      this.passwordListSource$,
      this.searchService.searchPhrase$
    ]).pipe(
      switchMap(([passwords, searchPhrase]) => this.getSearchResults$([passwords, searchPhrase])),
      map(({passwords, searchPhrase, searchResults}) => this.searchService.filterEntries(passwords, searchPhrase, searchResults)),
      shareReplay()
    );

    this.loadedDatabase$ = this.loadedDatabaseSource.asObservable();
    this.reloadedEntries$ = this.reloadedEntriesSource.asObservable();
    this.revealInGroup$ = this.revealedInGroupSource.asObservable();
    this.selectEntry$ = this.entrySelectedSource.asObservable();

    // shareReplay is used here to allow immediate rename mode on a new, manually created group
    this.renamedGroup$ = this.renamedGroupSource.asObservable().pipe(shareReplay());

    this.handleDatabaseLock();
    this.handleFoundAutotypeEntry();
    this.handleDatabaseSaved();

    this.communicationService.ipcRenderer.on(IpcChannel.Lock, () => {
      this.zone.run(() => {
        this.checkFileSaved(EventType.Lock);
      });
    });

    this.communicationService.ipcRenderer.on(IpcChannel.UpdateIcon, (_, id: number, iconPath: string) => {
      this.zone.run(() => {
        this.entryRepository.update({ id, iconPath }).then(() => {
          const entry = this.passwordEntries.find(x => x.id === id);

          if (!entry) {
            return;
          }

          entry.lastModificationDate = new Date();
          entry.iconPath = iconPath;

          this.updateEntries();
        });
      });
    });
  }

  @markDirty()
  async addOrUpdateEntry(entry: Partial<IPasswordEntry>): Promise<number> {
    let id: number;

    if (entry.id) {
      const editedEntry = { ...this.editedEntry };

      id = await this.entryRepository.update(entry);
      this.passwordEntries = await this.getEntries();
      this.selectedPasswords = [entry as IPasswordEntry];

      if (editedEntry.iconPath) {
        this.replaceIconPath(id, editedEntry, entry);
      } else {
        this.getIconPath(id, entry);
      }
    } else {
      id = await this.entryRepository.add(entry);
      this.passwordEntries = await this.getEntries();
      this.searchService.reset();

      this.getIconPath(id, entry);
    }

    return id;
  }

  private async getEntries(): Promise<IPasswordEntry[]> {
    if (this.selectedCategory.data.id === Number.MAX_SAFE_INTEGER) {
      return this.entryRepository.getAllByPredicate(x => x.isStarred);
    } else {
      return this.entryRepository.getAllByGroup(this.selectedCategory.data.id as number);
    }
  }

  @markDirty()
  async bulkAddEntries(entries: IPasswordEntry[]): Promise<number> {
    const addedEntries = await this.entryRepository.bulkAdd(entries);

    if (entries.some(x => x.groupId === this.selectedCategory?.data.id)) {
      this.passwordEntries = await this.entryRepository.getAllByGroup(this.selectedCategory?.data.id as number);
      this.updateEntries();
    }

    return addedEntries;
  }

  @markDirty()
  async deleteEntry() {
    await this.entryRepository.bulkDelete(this.selectedPasswords.map(p => p.id) as number[]);

    for (const entry of this.selectedPasswords) {
      this.removeIconPath(entry);
    }

    this.passwordEntries = await this.entryRepository.getAllByGroup(this.selectedCategory.data.id as number);
    this.selectedPasswords = [];
  }

  @markDirty()
  async moveEntry(targetGroupId: number) {
    this.passwordEntries = this.passwordEntries.filter(e => !this.draggedEntries.includes(e.id as number));
    this.updateEntries();

    const draggedEntries = [...this.draggedEntries];
    await this.entryRepository.moveEntries(draggedEntries, targetGroupId);
    this.passwordEntries = await this.entryRepository.getAllByGroup(this.selectedCategory.data.id as number);
  }

  @markDirty({ updateEntries: false })
  async removeGroup() {
    if (!this.selectedCategory) {
      this.throwCategoryNotSelectedError();
    }

    const groupsToDelete = [this.selectedCategory.data.id] as number[];
    this.getGroupsRecursive(this.selectedCategory, groupsToDelete);

    await this.groupRepository.bulkDelete(groupsToDelete);
    const node = this.selectedCategory;
    node.parent.data.children.splice(node.parent.data.children.indexOf(node.data), 1);
    this.selectedCategory.treeModel.update();
    this.selectedCategory.treeModel.getNodeById(1).focus();
  }

  @markDirty({ updateEntries: false })
  async updateGroup(group: IPasswordGroup) {
    await this.groupRepository.update({
      id: group.id,
      name: group.name,
    });
  }

  @markDirty({ updateEntries: false })
  async moveGroup(from: TreeNode, to: TreeNode){
    this.groupRepository.update({ ...from.data, parent: to.parent.data.id });
  }

  @markDirty({ updateEntries: false })
  async addGroup(model?: Partial<IPasswordGroup>): Promise<number> {
    if (!this.selectedCategory) {
      this.throwCategoryNotSelectedError();
    }

    if (!this.selectedCategory.data.children) {
      this.selectedCategory.data.children = [];
    }
  
    const newGroup: IPasswordGroup = {
      name: model?.name ?? 'New group',
      parent: this.selectedCategory.data.id,
    };

    if (model?.isImported) {
      newGroup.isImported = true;
    }

    const groupId = await this.groupRepository.add(newGroup);

    if (groupId > 0) {
      const newGroupNode = {
        id: groupId,
        name: newGroup.name,
        isImported: newGroup.isImported
      };

      this.selectedCategory.data.children.push(newGroupNode);

      this.selectedCategory.treeModel.update();
      this.selectedCategory.treeModel.getNodeById(newGroupNode.id).ensureVisible();
      this.selectedCategory.treeModel.getNodeById(newGroupNode.id).focus();
      this.selectedCategory = this.selectedCategory.treeModel.getNodeById(newGroupNode.id);

      if (!model?.name) {
        this.renameGroup(true);
      }
    }

    return groupId;
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

  renameGroup(isRenamed: boolean) {
    this.renamedGroupSource.next(isRenamed);
  }

  async selectGroup(event: { node: TreeNode }, reveal = false): Promise<number> {
    const groupId = event.node?.data.id;

    if (!groupId) {
      return;
    }

    if (this.selectedCategory?.id === groupId) {
      return groupId;
    }

    this.selectedCategory = event.node;

    if (!reveal) {
      this.selectedPasswords = [];
    }

    if (this.selectedCategory.data.id === Number.MAX_SAFE_INTEGER) {
      this.passwordEntries = await this.entryRepository.getAllByPredicate((x) => x.isStarred);
    } else {
      this.passwordEntries = await this.entryRepository.getAllByGroup(groupId);
    }
  
    this.searchService.reset();
    this.updateEntries();
    this.reloadedEntriesSource.next();

    return groupId;
  }

  setDatabaseLoaded(): void {
    this.loadedDatabaseSource.next(true);
  }

  async lock({ minimize = false }): Promise<void> {
    this.isLocked = true;

    this.selectedCategory = null;
    this.passwordEntries = [];
    this.groups = [];
    
    await this.dbContext.resetDb();

    this.communicationService.ipcRenderer.send(IpcChannel.Lock);
    this.router.navigate(['/home'], { queryParams: { minimize } });
  }

  unlock(): void {
    this.isLocked = false;
    this.router.navigate(['/dashboard']);
    this.communicationService.ipcRenderer.send(IpcChannel.Unlock);
  }

  async saveDatabase(newPassword?: string, config?: { forceNew?: boolean, notify?: boolean }): Promise<true | Error> {
    const blob = await exportDB(this.dbContext);

    const fileReader = new FileReader();
    fileReader.readAsText(blob);
    fileReader.onloadend = () => {
      this.communicationService.ipcRenderer.send(IpcChannel.SaveFile, { database: fileReader.result , newPassword, config });
    };

    return true;
  }

  async loadDatabase(jsonString: string) {
    const blob = new Blob([jsonString]);

    await importInto(this.dbContext, blob);

    this.groups = await this.getGroupsTree();
    this.setDatabaseLoaded();
  }

  async importDatabase(name: string, entries: IPasswordEntry[]): Promise<number> {
    const groupId = await this.addGroup({ name, isImported: true });
    const updated = entries.map(e => ({ ...e, groupId }));

    return this.bulkAddEntries(updated);
  }

  @markDirty({ updateEntries: false })
  async scanLeaks(): Promise<any> {
    return new Promise(async (resolve) => {
      const blob = await exportDB(this.dbContext);

      const fr = new FileReader();
      fr.readAsText(blob);
      fr.onloadend = async () => {
        const data = await this.communicationService.ipcRenderer.invoke(IpcChannel.ScanLeaks, fr.result);

        resolve(data);
      };
    });
  }

  async getExposedPasswords(): Promise<any> {
    const report = await this.reportRepository.getLastReport();

    if (!report) {
      return;
    }

    const reportPayload = JSON.parse(report.payload);
    const reportIds: number[] = JSON.parse(report.payload).map(x => x.id);

    const entries = await this.entryRepository.getAllByPredicate(x => reportIds.includes(x.id));
    const groups = await this.groupRepository.getAll();

    const reportedEntries = entries.map(e => {
      return {
        groupName: groups.find(x => x.id === e.groupId).name,
        title: e.title,
        username: e.username,
        occurrences: reportPayload.find(x => x.id === e.id).occurrences,
      }}
    );

    return { report, entries: reportedEntries };
  }

  addReport(report: IReport): Promise<number> {
    return this.reportRepository.add(report);
  }

  async clearDatabase() {
    await this.dbContext.resetDb();
    this.passwordEntries = [];
  }

  updateEntries() {
    this.passwordListSource$.next([...this.passwordEntries as IPasswordEntry[]]);
  }

  async saveNewDatabase(newPassword: string, config: { forceNew?: boolean, notify?: boolean }): Promise<true | Error> {
    return this.saveDatabase(newPassword, config);
  }

  setDateSaved() {
    this.dateSaved = new Date();
  }

  revealInGroup(entry: IPasswordEntry) {
    this.revealedInGroupSource.next(entry);
  }

  selectEntry(entry: IPasswordEntry) {
    this.entrySelectedSource.next(entry);
  }

  async setupDatabase() {
    await this.groupRepository.bulkAdd(initialEntries);

    this.groups[0] = {
      id: 1,
      name: 'Database',
      expanded: true,
      children: initialEntries.filter(x => x.parent === 1)
    };

    this.groups[1] = {
      id: Number.MAX_SAFE_INTEGER,
      name: 'Starred entries',
      expanded: true,
      children: []
    };

    if (AppConfig.mocks) {
      // eslint-disable-next-line
      await this.entryRepository.bulkAdd(require('assets/data/mock_data.json'));
    }

    this.setDateSaved();
    this.setDatabaseLoaded();
  }

  private getIconPath(id: number, entry: Partial<IPasswordEntry>): void {
    if (entry.url) {
      this.communicationService.ipcRenderer.send(IpcChannel.TryGetIcon, id, entry.url);
    }
  }

  private replaceIconPath(id: number, editedEntry: IPasswordEntry, newEntry: Partial<IPasswordEntry>): void {
    this.communicationService.ipcRenderer.send(IpcChannel.TryReplaceIcon, id, editedEntry.iconPath, newEntry.url);
  }

  private removeIconPath(entry: Partial<IPasswordEntry>): void {
    this.communicationService.ipcRenderer.send(IpcChannel.RemoveIcon, entry);
  }

  private exitApp() {
    window.onbeforeunload = null;

    setTimeout(() => {
      this.communicationService.ipcRenderer.send(IpcChannel.Exit);
    });
  }

  private getSearchResults$([passwords, searchPhrase]: GetSearchResultsModel): Observable<SearchResultsModel> {
    if (searchPhrase.length) {
      this.selectedPasswords = [];
    }

    if (this.isGlobalSearch) {
      return from(this.entryRepository.getSearchResults(searchPhrase))
        .pipe(map((searchResults) => ({ passwords, searchPhrase, searchResults })));
    }
    
    return of({ passwords, searchPhrase, searchResults: []});
  }

  private getGroupsRecursive(node: TreeNode, groups: number[]): number[] {
    if (!node.children?.length) {
      return [];
    }

    groups.push(...node.children.map(c => c.id));
    node.children.forEach((child) => {
      const a = this.getGroupsRecursive(child, groups);
      groups.push(...a);
    });

    return [];
  }

  private async getGroupsTree(): Promise<IPasswordGroup[]> {
    const allGroups = await this.groupRepository.getAll();
    this.groups[0] = allGroups.find(g => g.id === 1) as IPasswordGroup;
    this.groups[0].expanded = true;

    this.buildGroupsTree(this.groups[0], allGroups);

    return this.groups;
  }

  private buildGroupsTree(group: IPasswordGroup, groups: IPasswordGroup[]) {
    const children = groups.filter(g => g.parent === group.id);

    if (!children.length) {
      return;
    }

    group.children = children;
    group.children.forEach(child => {
      this.buildGroupsTree(child, groups);
    });
  }

  private throwCategoryNotSelectedError(): never {
    throw new Error('No category has been selected.');
  }

  private handleFoundAutotypeEntry() {
    this.communicationService.ipcRenderer.on(IpcChannel.GetAutotypeFoundEntry, (_, title: string) => {
      this.zone.run(async () => {
        const entries = await this.entryRepository.getAll();
        const entry = entries.find(e => this.isEntryMatching(e, title));

        this.communicationService.ipcRenderer.send(IpcChannel.AutocompleteEntry, entry);
      });
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

  private isEntryMatching(entry: IPasswordEntry, title: string): boolean {
    if (entry.notes?.length) {
      const autoTypeKey = 'auto_type';
      const autoTypePatternStart = entry.notes.toLowerCase().indexOf(autoTypeKey);

      if (autoTypePatternStart >= 0) {
        const pattern = entry.notes
          .substr(autoTypePatternStart + autoTypeKey.length + 1)
          .split('/[\n\r]/')[0];

        return new RegExp(pattern).test(title.toLowerCase());
      }
    }

    return title.toLowerCase().includes((entry.title as string).toLowerCase());
  }

  private handleDatabaseSaved() {
    this.communicationService.ipcRenderer.on(IpcChannel.GetSaveStatus, (_, { status, message, file, notify }) => {
      this.zone.run(() => {
        if (status) {
          this.file = { filePath: file, filename: file.split('\\').splice(-1)[0] };

          if (notify) {
            this.setDateSaved();

            this.notificationService.add({
              message: 'Database saved',
              alive: 5000,
              type: 'success'
            });
          }
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