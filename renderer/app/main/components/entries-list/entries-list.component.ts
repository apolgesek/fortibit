import {
	CdkVirtualScrollViewport,
	ScrollingModule,
} from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
	Component,
	DestroyRef,
	ElementRef,
	OnInit,
	QueryList,
	Type,
	ViewChild,
	ViewChildren,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupId } from '@app/core/enums';
import {
	ConfigService,
	EntryManager,
	GroupManager,
	WorkspaceService,
} from '@app/core/services';
import { ClipboardService } from '@app/core/services/clipboard.service';
import { ContextMenuBuilderService } from '@app/core/services/context-menu-builder.service';
import { ModalService } from '@app/core/services/modal.service';
import { SearchService } from '@app/core/services/search.service';
import { MenuItem, slideDown } from '@app/shared';
import { ContextMenuItemDirective } from '@app/shared/directives/context-menu-item.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { UiUtil } from '@app/utils';
import { Entry, PasswordEntry } from '@shared-renderer/index';
import { HotkeyHandler } from 'injection-tokens';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PasswordEntryComponent } from './password-entry/password-entry.component';
import { TableFiltersComponent } from '../table-filters/table-filters.component';

@Component({
	selector: 'app-entries-list',
	templateUrl: './entries-list.component.html',
	styleUrls: ['./entries-list.component.scss'],
	animations: [
		slideDown,
	],
	standalone: true,
	imports: [
		CommonModule,
		ScrollingModule,
		FocusableListDirective,
		FocusableListItemDirective,
		ContextMenuItemDirective,
		TableFiltersComponent,
	],
})
export class EntriesTableComponent implements OnInit {
	@ViewChild(CdkVirtualScrollViewport) public readonly scrollViewport:
		| CdkVirtualScrollViewport
		| undefined;
	@ViewChild('dragImage') public readonly dragImage: ElementRef;

	@ViewChildren(FocusableListItemDirective)
	public readonly listItems: QueryList<FocusableListItemDirective>;

	public passwordList$: Observable<Entry[]>;
	public searchPhrase$: Observable<string>;
	public entryMenuItems = new Map<Entry['type'], MenuItem[]>();
	public multiEntryMenuItems: MenuItem[] = [];
	public iconsEnabled: boolean;

	private readonly destroyRef = inject(DestroyRef);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly searchService = inject(SearchService);
	private readonly configService = inject(ConfigService);
	private readonly clipboardService = inject(ClipboardService);
	private readonly contextMenuBuilderService = inject(ContextMenuBuilderService);
	private readonly modalService = inject(ModalService);
	private readonly hotkeyHandler = inject(HotkeyHandler);

	constructor() {
		this.passwordList$ = this.entryManager.entries$;
		this.searchPhrase$ = this.searchService.searchPhrase$;
	}

	get activeFilters(): string[] {
		return [];
	}

	get selectedEntries(): Entry[] {
		return this.entryManager.selectedEntries;
	}

	get movedEntries(): number[] {
		return this.entryManager.movedEntries;
	}

	get passwordEntries(): Entry[] {
		return this.entryManager.entries ?? [];
	}

	get fileName(): string {
		return this.workspaceService.databaseFileName;
	}

	get searchPhraseSnapshot(): string {
		return this.searchService.searchPhraseSnapshot;
	}

	get entriesFound$(): Observable<number> {
		return this.entryManager.entries$.pipe(map((entries) => entries.length));
	}

	get isSearching(): boolean {
		return this.searchService.isSearching;
	}

	get wasSearched(): boolean {
		return this.searchService.wasSearched;
	}

	get entriesDragEnabled(): boolean {
		return this.groupManager.selectedGroup !== GroupId.Starred;
	}

	get isAddPossible(): boolean {
		return this.groupManager.isAddAllowed;
	}

	ngOnInit() {
		this.handleEntriesReload();

		this.multiEntryMenuItems = this.buildMultiEntryMenuItems();
		this.entryMenuItems.set('password', this.buildEntryMenuItems());

		this.configService.configLoadedSource$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => {
				this.iconsEnabled = config.displayIcons;
			});

		this.entryManager.selectFirstEntry$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				const firstItem: HTMLElement =
					this.listItems.first?.elRef?.nativeElement;
				if (firstItem) {
					firstItem.focus();
				}
			});
	}

	trackingTag(_: number, entry: PasswordEntry): string {
		return (
			entry.id +
				entry.title +
				entry.username +
				entry.password +
				(entry.lastModificationDate
					? new Date(entry.lastModificationDate).getTime()
					: 0) +
				entry.icon
		);
	}

	copyToClipboard(entry: PasswordEntry, property: keyof PasswordEntry) {
		this.clipboardService.copyEntryDetails(entry, property);
	}

	selectEntry(event: Event, entry: PasswordEntry) {
		if (this.hotkeyHandler.isMultiselectionKeyDown(event)) {
			const foundIndex = this.selectedEntries.findIndex(
				(p) => p.id === entry.id,
			);

			if (foundIndex > -1) {
				this.selectedEntries.splice(foundIndex, 1);
				return;
			}

			this.selectedEntries.push(entry);
		} else {
			this.entryManager.selectedEntries = [entry];
			this.entryManager.selectEntry(entry);
		}
	}

	showEntryContextMenu(event: MouseEvent, item: PasswordEntry) {
		event.preventDefault();

		if (
			this.selectedEntries.length === 0 ||
			this.selectedEntries.length === 1
		) {
			this.selectEntry(event, item);
		}
	}

	isEntrySelected(entry: PasswordEntry): boolean {
		return Boolean(this.selectedEntries.find((e) => e.id === entry?.id));
	}

	isEntryDragged(entry: PasswordEntry): boolean {
		return Boolean(this.entryManager.movedEntries.find((e) => e === entry?.id));
	}

	addNewEntry() {
		this.modalService.openNewEntryWindow();
	}

	startDrag(event: DragEvent, item: PasswordEntry) {
		this.entryManager.movedEntries =
			this.selectedEntries.length > 0
				? this.selectedEntries.map((e) => e.id)
				: [item.id];

		UiUtil.setDragGhost(event, this.dragImage.nativeElement);
	}

	endDrag() {
		this.entryManager.movedEntries = [];
	}

	getContextMenu(type: Entry['type']): MenuItem[] {
		if (this.selectedEntries.length === 1) {
			return this.entryMenuItems.get(type);
		} else {
			return this.multiEntryMenuItems;
		}
	}

	getComponentType(item: Entry): Type<unknown> {
		switch (item.type) {
			case 'password':
				return PasswordEntryComponent;
			default:
				throw new Error('Unsupported entry type');
		}
	}

	private handleEntriesReload() {
		this.entryManager.scrollTopEntries
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.scrollViewport?.scrollTo({ top: 0 });
			});
	}

	private buildEntryMenuItems(): MenuItem[] {
		return this.contextMenuBuilderService
			.buildCopyUsernameEntryContextMenuItem()
			.buildCopyPasswordEntryContextMenuItem()
			.buildSeparator()
			.buildEditEntryContextMenuItem()
			.buildMoveEntryContextMenuItem()
			.buildRemoveEntryContextMenuItem()
			.getResult();
	}

	private buildMultiEntryMenuItems(): MenuItem[] {
		return this.contextMenuBuilderService
			.buildRemoveEntryContextMenuItem()
			.buildMoveEntryContextMenuItem()
			.getResult();
	}
}
