import { IHotkeyHandler } from '@app/core/models';
import { ClipboardService } from '../clipboard.service';
import { EntryManager } from '../managers/entry.manager';
import { GroupManager } from '../managers/group.manager';
import { ModalService } from '../modal.service';
import { WorkspaceService } from '../workspace.service';
import { HotkeyLabel } from './hotkey-label';
import { authenticated } from './authenticated-decorator';
import { noOpenModal } from './no-open-modal-decorator';

export type Action = () => void;
export type ActionOrActions = Action | Action[];

type HotkeyLabelKey = keyof typeof HotkeyLabel;
type HotkeyLabelMap = { [key in HotkeyLabelKey]: string };

export type Config = {
	labelId?: HotkeyLabelKey;
};

export type HotkeyRegister = {
	[hotkey: string]: {
		actionOrActions: ActionOrActions;
		config: Config;
	};
};

function capitalizeFirstLetter(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export abstract class HotkeyHandler implements IHotkeyHandler {
	public hotkeys: HotkeyRegister = {};
	protected abstract keyMap: (event: KeyboardEvent) => string[];

	get hotkeysMap(): HotkeyLabelMap {
		const map = {} as HotkeyLabelMap;
		Object.keys(HotkeyLabel).forEach((key: HotkeyLabelKey) => {
			map[key] = this.getHotkeyLabel(key);
		});

		return map;
	}

	get isAnyModalOpen(): boolean {
		return this.modalService.isAnyModalOpen;
	}

	constructor(
		protected readonly modalService: ModalService,
		protected readonly clipboardService: ClipboardService,
		protected readonly workspaceService: WorkspaceService,
		protected readonly entryManager: EntryManager,
		protected readonly groupManager: GroupManager,
	) {}

	isMultiselectionKeyDown(event: MouseEvent): boolean {
		return event.ctrlKey;
	}

	intercept(event: KeyboardEvent) {
		if (!this.keyMap) {
			throw new Error('Key mapping is not implemented');
		}

		const hotkey = this.keyMap(event).filter(Boolean).join('+');

		const hotkeyDef = this.hotkeys[hotkey];
		if (hotkeyDef) {
			if (hotkeyDef.actionOrActions instanceof Array) {
				hotkeyDef.actionOrActions.forEach((element: () => void) => {
					element.call(this);
				});
			} else {
				hotkeyDef.actionOrActions.call(this);
			}

			event.preventDefault();
		}
	}

	public getContextMenuLabel(label: HotkeyLabelKey): string {
		for (const key in this.hotkeys) {
			if (Object.prototype.hasOwnProperty.call(this.hotkeys, key)) {
				const element = this.hotkeys[key];
				if (label === element.config?.labelId) {
					return `${HotkeyLabel[element.config.labelId]} (${key
						.split('+')
						.map(capitalizeFirstLetter)
						.join('+')})`;
				}
			}
		}
	}

	@noOpenModal
	@authenticated
	public saveDatabase() {
		if (!this.workspaceService.isSynced) {
			this.workspaceService.saveDatabase();
		}
	}

	@noOpenModal
	@authenticated
	public deleteEntry() {
		if (this.entryManager.selectedPasswords.length) {
			this.modalService.openDeleteEntryWindow();
		}
	}

	@noOpenModal
	@authenticated
	public deleteGroup() {
		if (
			this.groupManager.selectedGroup &&
			!this.groupManager.builtInGroups
				.map((x) => x.id)
				.includes(this.groupManager.selectedGroup) &&
			this.entryManager.selectedPasswords.length === 0
		) {
			this.modalService.openDeleteGroupWindow();
		}
	}

	@noOpenModal
	@authenticated
	public renameGroup() {
		if (
			this.groupManager.selectedGroup &&
			!this.groupManager.builtInGroups
				.map((x) => x.id)
				.includes(this.groupManager.selectedGroup)
		) {
			this.modalService.openGroupWindow('edit');
		}
	}

	@noOpenModal
	@authenticated
	public editEntry() {
		if (this.entryManager.selectedPasswords.length === 1) {
			this.modalService.openEditEntryWindow();
		}
	}

	@noOpenModal
	@authenticated
	public moveEntry() {
		if (this.entryManager.selectedPasswords.length) {
			this.modalService.openMoveEntryWindow();
		}
	}

	@noOpenModal
	@authenticated
	public copyPassword() {
		if (
			this.entryManager.selectedPasswords.length === 1 &&
			this.entryManager.selectedPasswords[0].type === 'password'
		) {
			this.clipboardService.copyEntryDetails(
				this.entryManager.selectedPasswords[0],
				'password',
			);
		}
	}

	@noOpenModal
	@authenticated
	public copyUsername() {
		if (
			this.entryManager.selectedPasswords.length === 1 &&
			this.entryManager.selectedPasswords[0].type === 'password'
		) {
			this.clipboardService.copyEntryDetails(
				this.entryManager.selectedPasswords[0],
				'username',
			);
		}
	}

	@noOpenModal
	@authenticated
	public addEntry() {
		if (this.groupManager.isAddAllowed) {
			this.modalService.openNewEntryWindow();
		}
	}

	@noOpenModal
	@authenticated
	public addGroup() {
		this.modalService.openGroupWindow();
	}

	@noOpenModal
	@authenticated
	public selectAllEntries() {
		if (this.entryManager.selectedPasswords.length) {
			this.entryManager.selectedPasswords = [];
			this.entryManager.selectedPasswords.push(
				...this.entryManager.passwordEntries,
			);
		}
	}

	@noOpenModal
	@authenticated
	public findEntries() {
		this.workspaceService.findEntries();
	}

	@noOpenModal
	@authenticated
	public findGlobalEntries() {
		this.workspaceService.findGlobalEntries();
	}

	@authenticated
	public lockDatabase() {
		if (this.workspaceService.file) {
			this.workspaceService.lock();
		}
	}

	@noOpenModal
	@authenticated
	public openHistory() {
		this.modalService.openEntryHistoryWindow();
	}

	@noOpenModal
	public openSettings() {
		this.modalService.openSettingsWindow();
	}

	public toggleFullscreen() {
		this.workspaceService.toggleFullscreen();
	}

	@noOpenModal
	public openGenerator() {
		this.modalService.openGeneratorWindow();
	}

	public zoomIn() {
		this.workspaceService.zoomIn();
	}

	public zoomOut() {
		this.workspaceService.zoomOut();
	}

	public resetZoom() {
		this.workspaceService.resetZoom();
	}

	get isLocked(): boolean {
		return this.workspaceService.isLocked;
	}

	protected registerHotkey(hotkey: string, action: Action, config?: Config);
	protected registerHotkey(hotkey: string, actions: Action[], config?: Config);
	protected registerHotkey(
		hotkey: string,
		actionOrActions: ActionOrActions,
		config?: Config,
	) {
		this.hotkeys[hotkey.toLowerCase()] = { actionOrActions, config };
	}

	private getHotkeyLabel(label: HotkeyLabelKey): string {
		for (const key in this.hotkeys) {
			if (Object.prototype.hasOwnProperty.call(this.hotkeys, key)) {
				const element = this.hotkeys[key];
				if (label === element?.config?.labelId) {
					return key.split('+').map(capitalizeFirstLetter).join('+');
				}
			}
		}
	}
}