import { Injectable, inject } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { MenuItem } from '@app/shared';
import { HotkeyHandler } from 'injection-tokens';
import { ClipboardService, EntryManager } from '.';
import { PasswordEntry } from '@shared-renderer/password-entry.model';

@Injectable({
	providedIn: 'root',
})
export class ContextMenuBuilderService {
	private readonly modalService = inject(ModalService);
	private readonly clipboardService = inject(ClipboardService);
	private readonly entryManager = inject(EntryManager);
	private readonly hotkeyHandler = inject(HotkeyHandler);
	private contextMenuItems: MenuItem[] = [];

	buildGroupContextMenuItems(
		configuration: { isRoot: boolean } = { isRoot: false },
	): this {
		const addEntryOption = this.hotkeyHandler.getContextMenuLabel('AddEntry');
		this.contextMenuItems = [
			{
				label: addEntryOption.label,
				hotkey: addEntryOption.hotkey,
				command: () => {
					this.modalService.openNewEntryWindow();
				},
			},
		];

		if (!configuration.isRoot) {
			const editOption = this.hotkeyHandler.getContextMenuLabel('Edit');
			const removeOption = this.hotkeyHandler.getContextMenuLabel('Remove');

			this.contextMenuItems.push(
				{
					label: editOption.label,
					hotkey: editOption.hotkey,
					command: () => {
						this.modalService.openGroupWindow('edit');
					},
				},
				{
					label: removeOption.label,
					hotkey: removeOption.hotkey,
					command: () => this.modalService.openDeleteGroupWindow(),
				},
			);
		}

		return this;
	}

	buildEmptyRecycleBinContextMenuItem(): this {
		this.contextMenuItems.push({
			label: 'Empty recycle bin',
			disabled: () => {
				return this.entryManager.entries.length === 0;
			},
			command: () => {
				this.entryManager.selectedEntries = [...this.entryManager.entries];
				this.modalService.openDeleteEntryWindow();
			},
		});

		return this;
	}

	buildRemoveEntryContextMenuItem(): this {
		const removeOption = this.hotkeyHandler.getContextMenuLabel('Remove');
		this.contextMenuItems.push({
			label: removeOption.label,
			hotkey: removeOption.hotkey,
			command: () => {
				this.modalService.openDeleteEntryWindow();
			},
		});

		return this;
	}

	buildCopyUsernameEntryContextMenuItem(): this {
		const copyUsernameOption =
			this.hotkeyHandler.getContextMenuLabel('CopyUsername');
		this.contextMenuItems.push({
			label: copyUsernameOption.label,
			hotkey: copyUsernameOption.hotkey,
			disabled: () => {
				const entry = this.entryManager.selectedEntries[0] as PasswordEntry;
				return !entry?.username;
			},
			command: () => {
				this.clipboardService.copyEntryDetails(
					this.entryManager.selectedEntries[0] as PasswordEntry,
					'username',
				);
			},
		});

		return this;
	}

	buildCopyPasswordEntryContextMenuItem(): this {
		const copyPasswordOption =
			this.hotkeyHandler.getContextMenuLabel('CopyPassword');
		this.contextMenuItems.push({
			label: copyPasswordOption.label,
			hotkey: copyPasswordOption.hotkey,
			command: () => {
				this.clipboardService.copyEntryDetails(
					this.entryManager.selectedEntries[0] as PasswordEntry,
					'password',
				);
			},
		});

		return this;
	}

	buildCopyTotpEntryContextMenuItem(): this {
		const copyTotpOption = this.hotkeyHandler.getContextMenuLabel('CopyTotp');
		this.contextMenuItems.push({
			label: copyTotpOption.label,
			hotkey: copyTotpOption.hotkey,
			disabled: () => {
				const entry = this.entryManager.selectedEntries[0] as PasswordEntry;
				return !entry?.otpAuth;
			},
			command: () => {
				this.clipboardService.copyEntryDetails(
					this.entryManager.selectedEntries[0] as PasswordEntry,
					'otpAuth',
				);
			},
		});

		return this;
	}

	buildEditEntryContextMenuItem(): this {
		const editOption = this.hotkeyHandler.getContextMenuLabel('Edit');
		this.contextMenuItems.push({
			label: editOption.label,
			hotkey: editOption.hotkey,
			command: () => {
				this.modalService.openEditEntryWindow();
			},
		});

		return this;
	}

	buildMoveEntryContextMenuItem(): this {
		const moveOption = this.hotkeyHandler.getContextMenuLabel('MoveEntry');
		this.contextMenuItems.push({
			label: moveOption.label,
			hotkey: moveOption.hotkey,
			command: () => {
				this.modalService.openMoveEntryWindow();
			},
		});

		return this;
	}

	buildSeparator(): this {
		this.contextMenuItems.push({ separator: true });

		return this;
	}

	getResult(): MenuItem[] {
		const items = this.contextMenuItems;
		this.contextMenuItems = [];

		return items;
	}
}
