import { Inject, Injectable, NgZone } from "@angular/core";
import { CommunicationService } from "@app/app.module";
import { markDirty } from "@app/core/decorators/mark-dirty.decorator";
import { GroupIds } from "@app/core/enums";
import { ICommunicationService } from "@app/core/models";
import { EntryRepository, HistoryRepository } from "@app/core/repositories";
import { IHistoryEntry } from "@shared-renderer/history-entry.model";
import { IpcChannel } from "@shared-renderer/ipc-channel.enum";
import { IPasswordEntry } from "@shared-renderer/password-entry.model";
import { BehaviorSubject, combineLatest, from, map, Observable, of, shareReplay, Subject, switchMap } from "rxjs";
import { SearchService } from "../search.service";
import { GroupsManager } from "./groups.manager";

interface SearchResultsModel {
  passwords: IPasswordEntry[],
  searchPhrase: string,
  searchResults: IPasswordEntry[]
}

type GetSearchResultsModel = [passwords: IPasswordEntry[], searchPhrase: string];

@Injectable({ providedIn: 'root' })
export class EntriesManager {
  public readonly entries$: Observable<IPasswordEntry[]>;
  public readonly reloadedEntries$: Observable<void>;
  public readonly revealInGroup$: Observable<IPasswordEntry>;
  public readonly selectEntry$: Observable<IPasswordEntry>;

  public draggedEntries: number[] = [];
  public editedEntry?: IPasswordEntry;
  public passwordEntries: IPasswordEntry[] = [];
  public selectedPasswords: IPasswordEntry[] = [];
  public entryHistory: IHistoryEntry[];

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
    private readonly groupsManager: GroupsManager,
  ) {
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

    this.handleFoundAutotypeEntry();

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

      const historyEntry: IHistoryEntry = {
        entry: editedEntry,
        entryId: editedEntry.id
      };

      await this.historyRepository.add(historyEntry);
      this.entryHistory = await this.getEntryHistory(entry.id);
    } else {
      id = await this.entryRepository.add(entry);
      this.passwordEntries = await this.getEntries();
      this.searchService.reset();

      this.getIconPath(id, entry);
    }

    return id;
  }

  private async getEntries(): Promise<IPasswordEntry[]> {
    if (this.groupsManager.selectedCategory.data.id === GroupIds.Starred) {
      return this.entryRepository.getAllByPredicate(x => x.isStarred);
    } else {
      return this.entryRepository.getAllByGroup(this.groupsManager.selectedCategory.data.id as number);
    }
  }

  @markDirty()
  async bulkAddEntries(entries: IPasswordEntry[]): Promise<number> {
    const addedEntries = await this.entryRepository.bulkAdd(entries);

    if (entries.some(x => x.groupId === this.groupsManager.selectedCategory?.data.id)) {
      this.passwordEntries = await this.entryRepository.getAllByGroup(this.groupsManager.selectedCategory?.data.id as number);
      this.updateEntries();
    }

    return addedEntries;
  }

  @markDirty()
  async deleteEntry() {
    if (this.groupsManager.selectedCategory.data.id === GroupIds.RecycleBin) {
      await this.entryRepository.bulkDelete(this.selectedPasswords.map(p => p.id));
      await this.historyRepository.bulkDelete(this.selectedPasswords.map(x => x.id));

      for (const entry of this.selectedPasswords) {
        this.removeIconPath(entry);
      }
    } else {
      await this.entryRepository.softDelete(this.selectedPasswords.map(p => p.id) as number[]);
    }

    this.passwordEntries = await this.entryRepository.getAllByGroup(this.groupsManager.selectedCategory.data.id as number);
    this.selectedPasswords = [];
  }

  @markDirty()
  async moveEntry(targetGroupId: number) {
    this.passwordEntries = this.passwordEntries.filter(e => !this.draggedEntries.includes(e.id as number));
    this.updateEntries();

    const draggedEntries = [...this.draggedEntries];
    await this.entryRepository.moveEntries(draggedEntries, targetGroupId);
    this.passwordEntries = await this.entryRepository.getAllByGroup(this.groupsManager.selectedCategory.data.id as number);
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

    return history;
  }

  updateEntries() {
    this.passwordListSource$.next([...this.passwordEntries as IPasswordEntry[]]);
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

  private handleFoundAutotypeEntry() {
    this.communicationService.ipcRenderer.on(IpcChannel.GetAutotypeFoundEntry, (_, title: string) => {
      this.zone.run(async () => {
        const entries = await this.entryRepository.getAll();
        const entry = entries.find(e => this.isEntryMatching(e, title));

        this.communicationService.ipcRenderer.send(IpcChannel.AutocompleteEntry, entry);
      });
    });
  }

  private isEntryMatching(entry: IPasswordEntry, title: string): boolean {
    if (entry.autotypeExp) {
      return new RegExp(entry.autotypeExp).test(title.toLowerCase());
    }

    return title.toLowerCase().includes((entry.title as string).toLowerCase());
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
}