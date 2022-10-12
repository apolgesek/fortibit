import { Inject, Injectable, NgZone } from "@angular/core";
import { CommunicationService } from "@app/app.module";
import { GroupId } from "@app/core/enums";
import { ICommunicationService } from "@app/core/models";
import { EntryRepository, HistoryRepository } from "@app/core/repositories";
import { IHistoryEntry } from "@shared-renderer/history-entry.model";
import { IpcChannel } from "@shared-renderer/ipc-channel.enum";
import { IPasswordEntry } from "@shared-renderer/password-entry.model";
import { BehaviorSubject, combineLatest, from, map, Observable, of, shareReplay, Subject, switchMap } from "rxjs";
import { SearchService } from "../search.service";
import { GroupManager } from "./group.manager";

interface SearchResultsModel {
  passwords: IPasswordEntry[],
  searchPhrase: string,
  searchResults: IPasswordEntry[]
}

type GetSearchResultsModel = [passwords: IPasswordEntry[], searchPhrase: string];

@Injectable({ providedIn: 'root' })
export class EntryManager {
  public readonly entries$: Observable<IPasswordEntry[]>;
  public readonly reloadedEntries$: Observable<void>;
  public readonly revealInGroup$: Observable<IPasswordEntry>;
  public readonly selectEntry$: Observable<IPasswordEntry>;

  public draggedEntries: number[] = [];
  public editedEntry?: IPasswordEntry;
  public passwordEntries: IPasswordEntry[] = [];
  public selectedPasswords: IPasswordEntry[] = [];
  public entryHistory: IHistoryEntry[];
  public markDirtySource: Subject<void>;

  private readonly reloadedEntriesSource: Subject<void> = new Subject();
  private readonly revealedInGroupSource: Subject<IPasswordEntry> = new Subject();
  private readonly entrySelectedSource: Subject<IPasswordEntry> = new Subject();
  private readonly passwordListSource$: BehaviorSubject<IPasswordEntry[]> = new BehaviorSubject<IPasswordEntry[]>([]);

  get isGlobalSearch(): boolean {
    return this.searchService.isGlobalSearchMode;
  }

  set isGlobalSearch(value: boolean) {
    this.searchService.isGlobalSearchMode = value;
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly zone: NgZone,
    private readonly searchService: SearchService,
    private readonly entryRepository: EntryRepository,
    private readonly historyRepository: HistoryRepository,
    private readonly groupManager: GroupManager,
  ) {
    this.markDirtySource = new Subject();

    this.entries$ = combineLatest([
      this.passwordListSource$,
      this.searchService.searchPhrase$
    ]).pipe(
      switchMap(([passwords, searchPhrase]) => this.getSearchResults$([passwords, searchPhrase])),
      map(({passwords, searchPhrase, searchResults}) => this.searchService.filterEntries(passwords, searchPhrase, searchResults)),
      shareReplay()
    );

    this.reloadedEntries$ = this.reloadedEntriesSource.asObservable();
    this.revealInGroup$ = this.revealedInGroupSource.asObservable();
    this.selectEntry$ = this.entrySelectedSource.asObservable();

    this.handleEntryAutotype();

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
        this.getIconPath(entry);
      }

      const historyEntry: IHistoryEntry = {
        entry: editedEntry,
        entryId: editedEntry.id
      };

      // undefined when isStarred toggled
      if (historyEntry?.entryId) {
        await this.historyRepository.add(historyEntry);
        this.entryHistory = await this.getEntryHistory(entry.id);
      }
    } else {
      id = await this.entryRepository.add(entry);
      this.getIconPath({ ...entry, id });
      this.passwordEntries = await this.getEntries();
      this.searchService.reset();
    }

    this.markDirty();

    return id;
  }

  async setByGroup(id: number) {
    if (id === GroupId.Starred) {
      this.passwordEntries = await this.entryRepository.getAllByPredicate(x => x.isStarred);
    } else if (id === GroupId.AllItems) {
      this.passwordEntries = await this.entryRepository.getAll();
    } else {
      this.passwordEntries = await this.entryRepository.getAllByGroup(id);
    }
  }

  private async getEntries(): Promise<IPasswordEntry[]> {
    let entries = [];

    if (this.groupManager.selectedGroup === GroupId.Starred) {
      entries = await this.entryRepository.getAllByPredicate(x => x.isStarred);
    } else if (this.groupManager.selectedGroup === GroupId.AllItems) {
      entries = await this.entryRepository.getAll();
    } else {
      entries = await this.entryRepository.getAllByGroup(this.groupManager.selectedGroup);
    }

    for (const entry of entries) {
      this.setExpiration(entry);
    }

    return entries;
  }

  async bulkAddEntries(entries: IPasswordEntry[]): Promise<number> {
    const addedEntries = await this.entryRepository.bulkAdd(entries);

    if (entries.some(x => x.groupId === this.groupManager.selectedGroup)) {
      this.passwordEntries = await this.entryRepository.getAllByGroup(this.groupManager.selectedGroup as number);
      this.updateEntries();
    }

    this.markDirty();

    return addedEntries;
  }

  async deleteEntry() {
    if (this.groupManager.selectedGroup === GroupId.RecycleBin) {
      for await (const entry of this.selectedPasswords) {
        this.removeIconPath(entry);
      }

      await this.historyRepository.bulkDelete(this.selectedPasswords.map(x => x.id));
      await this.entryRepository.bulkDelete(this.selectedPasswords.map(p => p.id));
    } else {
      await this.entryRepository.softDelete(this.selectedPasswords.map(p => p.id) as number[]);
    }

    this.passwordEntries = await this.entryRepository.getAllByGroup(this.groupManager.selectedGroup as number);
    this.selectedPasswords = [];

    this.markDirty();
  }

  async moveEntry(targetGroupId: number) {
    this.passwordEntries = this.passwordEntries.filter(e => !this.draggedEntries.includes(e.id as number));
    this.updateEntries();

    const draggedEntries = [...this.draggedEntries];
    await this.entryRepository.moveEntries(draggedEntries, targetGroupId);
    this.passwordEntries = await this.entryRepository.getAllByGroup(this.groupManager.selectedGroup as number);
    
    this.draggedEntries = [];
    this.selectedPasswords = [];

    this.markDirty();
  }

  selectEntry(entry: IPasswordEntry) {
    this.getEntryHistory(entry.id).then(history => {
      this.entryHistory = history;
    });

    this.entrySelectedSource.next(entry);
  }

  async getEntryHistory(id: number): Promise<IHistoryEntry[]> {
    const history = await this.historyRepository.get(id);
    history.sort((a, b) => b.id - a.id);

    this.entryHistory = history;

    return this.entryHistory;
  }

  async deleteEntryHistory(entryId: number, entry: IPasswordEntry): Promise<void> {
    await this.historyRepository.delete(entryId);
    await this.getEntryHistory(entry.id);
  }

  updateEntries() {
    this.passwordListSource$.next([...this.passwordEntries as IPasswordEntry[]]);
  }

  reloadEntries() {
    this.reloadedEntriesSource.next();
  }

  getIconPath(entry: Partial<IPasswordEntry>): void {
    if (entry.url) {
      this.communicationService.ipcRenderer.send(IpcChannel.TryGetIcon, entry.id, entry.url);
    }
  }

  revealInGroup(entry: IPasswordEntry) {
    this.revealedInGroupSource.next(entry);
  }

  private setExpiration(entry: IPasswordEntry): void {
    if (!entry.expirationDate) {
      return;
    }

    const daysDue = 3;
    const date = new Date();

    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    date.setDate(date.getDate() + daysDue);

    if (entry.expirationDate < new Date()) {
      entry.expirationStatus = 'expired';
    } else if (entry.expirationDate > new Date() && entry.expirationDate <= date) {
      entry.expirationStatus = 'due-expiration';
    }
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

  private handleEntryAutotype() {
    this.communicationService.ipcRenderer.on(IpcChannel.GetAutotypeFoundEntry, (_, title: string) => {
      this.zone.run(async () => {
        const entries = await this.entryRepository.getAll();
        const entry = entries.find(e => this.isEntryMatchingRegex(e, title));

        this.communicationService.ipcRenderer.send(IpcChannel.AutocompleteEntry, entry);
      });
    });
  }

  private isEntryMatchingRegex(entry: IPasswordEntry, title: string): boolean {
    if (entry.autotypeExp) {
      return new RegExp(entry.autotypeExp).test(title.toLowerCase());
    }
    
    if (entry.title) {
      return title.toLowerCase().includes((entry.title as string).toLowerCase());
    }

    return false;
  }

  private replaceIconPath(id: number, editedEntry: IPasswordEntry, newEntry: Partial<IPasswordEntry>): void {
    this.communicationService.ipcRenderer.send(IpcChannel.TryReplaceIcon, id, editedEntry.iconPath, newEntry.url);
  }

  private removeIconPath(entry: Partial<IPasswordEntry>): Promise<boolean> {
    return this.communicationService.ipcRenderer.invoke(IpcChannel.RemoveIcon, entry);
  }

  private markDirty() {
    this.updateEntries();

    this.markDirtySource.next();
  }
}