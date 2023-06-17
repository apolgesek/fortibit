import { Inject, Injectable } from '@angular/core';
import { ModalService } from '@app/core/services/modal.service';
import { MenuItem } from '@app/shared';
import { HotkeyHandler } from 'injection-tokens';
import { ClipboardService, EntryManager } from '.';
import { IHotkeyHandler } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuBuilderService {
  private contextMenuItems: MenuItem[] = [];

  constructor(
    private readonly modalService: ModalService,
    private readonly clipboardService: ClipboardService,
    private readonly entryManager: EntryManager,
    @Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler
  ) {}

  buildGroupContextMenuItems(configuration: { isRoot: boolean } = { isRoot: false }): this {
    this.contextMenuItems = [
      {
        label: this.hotkeyHandler.configuration.renameGroupLabel,
        disabled: configuration.isRoot,
        command: () => {
          this.modalService.openGroupWindow('edit');
        }
      },
      {
        label: this.hotkeyHandler.configuration.removeGroupLabel,
        disabled: configuration.isRoot,
        command: () => this.modalService.openDeleteGroupWindow(),
      },
    ];

    return this;
  }

  buildEmptyRecycleBinContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.emptyBinLabel,
      command: () => {
        this.entryManager.selectedPasswords = [...this.entryManager.passwordEntries];
        this.modalService.openDeleteEntryWindow();
      }
    });

    return this;
  }

  buildRemoveEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.deleteLabel,
      command: () => {
        this.modalService.openDeleteEntryWindow();
      }
    });

    return this;
  }

  buildCopyUsernameEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.copyUsernameLabel,
      command: () => {
        this.clipboardService.copyToClipboard(
          this.entryManager.selectedPasswords[0],
          'username'
        );
      }
    });

    return this;
  }

  buildCopyPasswordEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.copyPasswordLabel,
      command: () => {
        this.clipboardService.copyToClipboard(
          this.entryManager.selectedPasswords[0],
          'password'
        );
      }
    });

    return this;
  }

  buildEditEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Edit (E)',
      command: () => {
        this.modalService.openEditEntryWindow();
      }
    });

    return this;
  }

  buildMoveEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.moveEntryLabel,
      command: () => {
        this.modalService.openMoveEntryWindow();
      }
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
