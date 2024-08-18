import { Injectable, NgZone, inject } from '@angular/core';
import { GroupId } from '@app/core/enums';
import { EntryRepository, EntryPredicateFn } from '@app/core/repositories';
import { HistoryEntry } from '@shared-renderer/history-entry.model';
import { MessageBroker } from 'injection-tokens';
import {
	BehaviorSubject,
	combineLatest,
	from,
	map,
	Observable,
	of,
	shareReplay,
	Subject,
	switchMap,
} from 'rxjs';
import { NotificationService } from '../notification.service';
import { SearchService } from '../search.service';
import { GroupManager } from './group.manager';
import { DbManager } from '@app/core/database';
import { HistoryManager } from './history.manager';
import { Entry, IpcChannel, PasswordEntry } from '@shared-renderer/index';
import { IProcessor, PasswordProcessor } from '../processors';

type SearchResults = {
	passwords: Entry[];
	searchPhrase: string;
	searchResults: Entry[];
};

type GetSearchResultsModel = [passwords: Entry[], searchPhrase: string];

@Injectable({ providedIn: 'root' })
export class EntryManager {
	public readonly entries$: Observable<Entry[]>;
	public readonly scrollTopEntries: Observable<void>;
	public readonly selectEntry$: Observable<Entry>;
	public readonly selectFirstEntry$: Observable<void>;

	public readonly markDirtySource: Subject<void>;

	public movedEntries: number[] = [];
	public editedEntry?: Entry;
	public entries: Entry[] = [];
	public selectedEntries: Entry[] = [];
	public entryHistory: HistoryEntry[];

	private readonly entryRepository: EntryRepository = new EntryRepository(
		inject(DbManager),
	);

	private readonly scrollTopEntriesSource = new Subject<void>();
	private readonly firstEntrySelectedSource = new Subject<void>();
	private readonly entrySelectedSource =
		new BehaviorSubject<Entry>(this.selectedEntries[0]);
	private readonly entryListSource: BehaviorSubject<Entry[]> =
		new BehaviorSubject<Entry[]>([]);

	private readonly messageBroker = inject(MessageBroker);
	private readonly zone = inject(NgZone);
	private readonly searchService = inject(SearchService);
	private readonly notificationService = inject(NotificationService);
	private readonly historyManager = inject(HistoryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly processors: Partial<Record<Entry['type'], IProcessor<any>>> = {
		password: inject(PasswordProcessor)
	}

	constructor() {
		this.markDirtySource = new Subject();

		this.entries$ = combineLatest([
			this.entryListSource,
			this.searchService.searchPhrase$,
		]).pipe(
			switchMap(([passwords, searchPhrase]) =>
				this.getSearchResults$([passwords, searchPhrase]),
			),
			map(({ passwords, searchPhrase, searchResults }) =>
				this.searchService.filterEntries(
					passwords,
					searchPhrase,
					searchResults,
				),
			),
			shareReplay(),
		);

		this.scrollTopEntries = this.scrollTopEntriesSource.asObservable();
		this.selectEntry$ = this.entrySelectedSource.asObservable();
		this.selectFirstEntry$ = this.firstEntrySelectedSource.asObservable(); // when search box is focused and ArrowDown key is pressed

		this.handleEntryAutotype();

		this.messageBroker.ipcRenderer.on(
			IpcChannel.UpdateIcon,
			(_, id: number, iconPath: string) => {
				this.zone.run(async () => {
					const entry = this.entries.find(
						(x) => x.id === id,
					) as PasswordEntry;
					if (!entry) {
						return;
					}

					await this.entryRepository.update({ id, icon: iconPath });
					entry.icon = iconPath;
					entry.lastModificationDate = new Date();

					this.updateEntriesSource();
				});
			},
		);

		this.messageBroker.ipcRenderer.on(IpcChannel.UpdateSecureProtocolAvailability, (_, urls: string) => {
			this.zone.run(async () => {
				for (const url of urls) {
					await this.entryRepository.markSecureProtocolAvailable(url);
				}

				this.entries = await this.getEntries();
				this.updateEntriesSource();
				this.updateSelectedEntry();
				this.markDirty();
			});
		});
	}

	get isGlobalSearch(): boolean {
		return this.searchService.isGlobalSearchMode;
	}

	set isGlobalSearch(value: boolean) {
		this.searchService.isGlobalSearchMode = value;
	}

	async saveEntry(entry: Partial<Entry>, changes?: string[]): Promise<number> {
		let id: number;
		const entryProcessor = this.processors[entry.type];

		if (entry.id) {
			const editedEntry = { ...this.editedEntry };
			
			entryProcessor.beforeUpdate(entry, this.editedEntry, changes);

			id = await this.entryRepository.update(entry);
			this.entries = await this.getEntries();
			this.selectedEntries = [{ ...editedEntry, ...entry } as Entry];

			entryProcessor.afterUpdate(entry, this.editedEntry, changes);

			const historyEntry: HistoryEntry = {
				entry: editedEntry,
				entryId: editedEntry.id,
			};

			// undefined when isStarred toggled
			if (historyEntry?.entryId) {
				await this.historyManager.add(historyEntry);
				await this.historyManager.deleteExcessiveRows();
				this.entryHistory = await this.getEntryHistory(entry.id);
			}

			// reselect entry to update details in the sidebar
			this.selectEntry(this.selectedEntries[0] as Entry);
		} else {
			id = await this.entryRepository.add(entry);
			const newEntry = { ...entry, id };

			entryProcessor.afterAdd(newEntry);
			
			this.entries = await this.getEntries();
			this.searchService.reset();
		}

		this.markDirty();

		return id;
	}

	async setByGroup(id: number): Promise<void> {
		this.selectedEntries = [];
		this.entries = await this.getEntries(id);
	}

	async bulkAdd(entries: Entry[]): Promise<number> {
		const addedEntries = await this.entryRepository.bulkAdd(entries);

		if (entries.some((x) => x.groupId === this.groupManager.selectedGroup)) {
			this.entries = await this.getEntries();
			this.updateEntriesSource();
		}

		this.markDirty();

		return addedEntries;
	}

	async deleteEntry(): Promise<number[]> {
		const selectedIds = this.selectedEntries.map((x) => x.id);

		if (this.groupManager.selectedGroup === GroupId.RecycleBin) {
			await this.historyManager.bulkDelete(selectedIds);
			await this.entryRepository.bulkDelete(selectedIds);

			this.entries = await this.getEntries();

			this.selectedEntries.forEach(entry => {
				this.processors[entry.type].afterDelete(entry);
			});
		} else {
			await this.entryRepository.softDelete(
				this.selectedEntries.map((p) => p.id) as number[],
			);
			this.entries = await this.getEntries();
		}

		this.selectedEntries = [];
		this.markDirty();

		return selectedIds;
	}

	async bulkDelete(ids: number[]): Promise<void> {
		return this.entryRepository.bulkDelete(ids);
	}

	async moveEntry(targetGroupId: number): Promise<void> {
		if (
			this.groupManager.selectedGroup !== GroupId.AllItems &&
			this.groupManager.selectedGroup !== GroupId.Starred
		) {
			this.entries = this.entries.filter(
				(e) => !this.movedEntries.includes(e.id as number),
			);
			this.updateEntriesSource();
		}

		const draggedEntries = [...this.movedEntries];
		await this.entryRepository.moveEntries(draggedEntries, targetGroupId);

		this.entries = await this.getEntries();
		this.notificationService.add({
			message: `${this.movedEntries.length > 1 ? 'Entries' : 'Entry'} moved`,
			type: 'success',
			alive: 10 * 1000,
		});

		this.movedEntries = [];
		this.selectedEntries = [];

		this.markDirty();
	}

	async selectEntry(entry?: Entry): Promise<void> {
		if (entry) {
			entry.group =
				this.groupManager.groups.find((x) => x.id === entry.groupId)?.name ??
				// could be Recycle bin
				this.groupManager.builtInGroups.find((g) => g.id === entry.groupId)
					.name;
		}

		this.entrySelectedSource.next(entry);
	}

	async getEntryHistory(id: number): Promise<HistoryEntry[]> {
		const history = await this.historyManager.get(id);
		history.sort((a, b) => b.id - a.id);

		this.entryHistory = history;

		return this.entryHistory;
	}

	async deleteEntryHistory(entryId: number, entry: Entry): Promise<void> {
		await this.historyManager.delete(entryId);
		await this.getEntryHistory(entry.id);

		this.markDirty();
	}

	async bulkMarkExposed(ids: number[]): Promise<void> {
		await this.entryRepository.markExposed(ids);
		this.entries = await this.getEntries();
		this.updateEntriesSource();
		this.updateSelectedEntry();
		this.markDirty();
	}

	updateEntriesSource() {
		this.entryListSource.next([...(this.entries as Entry[])]);
	}

	reloadEntries() {
		this.scrollTopEntriesSource.next();
	}

	updateIcon(id: number, icon: string): Promise<number> {
		return this.entryRepository.update({ id, icon });
	}

	selectFirstEntry() {
		this.firstEntrySelectedSource.next();
	}

	async get(id: number): Promise<Entry> {
		return this.entryRepository.get(id);
	}

	async getAllByPredicate(predicate: EntryPredicateFn): Promise<Entry[]> {
		return this.entryRepository.getAllByPredicate(predicate);
	}

	async getAllByGroup(groupId: number): Promise<Entry[]> {
		return this.entryRepository.getAllByGroup(groupId);
	}

	async getEntries(id = this.groupManager.selectedGroup): Promise<Entry[]> {
		return await this.getEntriesInternal(id);
	}

	private async getEntriesInternal(id: number): Promise<Entry[]> {
		if (id === GroupId.Starred) {
			return this.entryRepository.getAllByPredicate((x) => x.isStarred);
		} else if (id === GroupId.AllItems) {
			return this.entryRepository.getAllByPredicate(
				(x) => x.groupId !== GroupId.RecycleBin,
			);
		} else {
			return this.entryRepository.getAllByGroup(id);
		}
	}

	private getSearchResults$([
		passwords,
		searchPhrase,
	]: GetSearchResultsModel): Observable<SearchResults> {
		if (searchPhrase.length) {
			this.selectedEntries = [];
		}

		if (this.isGlobalSearch) {
			return from(this.entryRepository.getSearchResults(searchPhrase)).pipe(
				map((searchResults) => ({ passwords, searchPhrase, searchResults })),
			);
		}

		return of({ passwords, searchPhrase, searchResults: [] });
	}

	private handleEntryAutotype() {
		this.messageBroker.ipcRenderer.on(
			IpcChannel.GetAutotypeFoundEntry,
			(_, title: string) => {
				this.zone.run(async () => {
					const allEntries =
						(await this.entryRepository.getAll()) as PasswordEntry[];
					const matchingEntries = allEntries.filter((e) =>
						this.isEntryMatchingRegex(e, title),
					);
					this.messageBroker.ipcRenderer.send(
						IpcChannel.AutocompleteEntry,
						matchingEntries,
					);
				});
			},
		);
	}

	private isEntryMatchingRegex(entry: PasswordEntry, title: string): boolean {
		if (entry.autotypeExp) {
			return new RegExp(entry.autotypeExp).test(title);
		}

		if (entry.title?.trim()) {
			return title
				.toLowerCase()
				.includes((entry.title as string).toLowerCase());
		}

		return false;
	}

	private markDirty() {
		this.updateEntriesSource();
		this.markDirtySource.next();
	}

	private updateSelectedEntry() {
		if (this.selectedEntries.length === 1) {
			const entry = this.entries.find(x => x.id === this.selectedEntries[0].id);
			this.selectEntry(entry);
		}
	}
}
