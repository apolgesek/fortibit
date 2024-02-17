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
		this.contextMenuItems = [
			{
				label: this.hotkeyHandler.getContextMenuLabel('AddEntry'),
				command: () => {
					this.modalService.openNewEntryWindow();
				},
			},
		];

		if (!configuration.isRoot) {
			this.contextMenuItems.push(
				{
					label: this.hotkeyHandler.getContextMenuLabel('Edit'),
					command: () => {
						this.modalService.openGroupWindow('edit');
					},
				},
				{
					label: this.hotkeyHandler.getContextMenuLabel('Remove'),
					command: () => this.modalService.openDeleteGroupWindow(),
				},
			);
		}

		return this;
	}

	buildEmptyRecycleBinContextMenuItem(): this {
		this.contextMenuItems.push({
			label: 'Empty recycle bin',
			disabled: () => this.entryManager.passwordEntries.length === 0,
			command: () => {
				this.entryManager.selectedPasswords = [
					...this.entryManager.passwordEntries,
				];
				this.modalService.openDeleteEntryWindow();
			},
		});

		return this;
	}

	buildRemoveEntryContextMenuItem(): this {
		this.contextMenuItems.push({
			label: this.hotkeyHandler.getContextMenuLabel('Remove'),
			command: () => {
				this.modalService.openDeleteEntryWindow();
			},
		});

		return this;
	}

	buildCopyUsernameEntryContextMenuItem(): this {
		this.contextMenuItems.push({
			label: this.hotkeyHandler.getContextMenuLabel('CopyUsername'),
			command: () => {
				this.clipboardService.copyEntryDetails(
					this.entryManager.selectedPasswords[0] as PasswordEntry,
					'username',
				);
			},
		});

		return this;
	}

	buildCopyPasswordEntryContextMenuItem(): this {
		this.contextMenuItems.push({
			label: this.hotkeyHandler.getContextMenuLabel('CopyPassword'),
			command: () => {
				this.clipboardService.copyEntryDetails(
					this.entryManager.selectedPasswords[0] as PasswordEntry,
					'password',
				);
			},
		});

		return this;
	}

	buildEditEntryContextMenuItem(): this {
		this.contextMenuItems.push({
			label: this.hotkeyHandler.getContextMenuLabel('Edit'),
			command: () => {
				this.modalService.openEditEntryWindow();
			},
		});

		return this;
	}

	buildMoveEntryContextMenuItem(): this {
		this.contextMenuItems.push({
			label: this.hotkeyHandler.getContextMenuLabel('MoveEntry'),
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
