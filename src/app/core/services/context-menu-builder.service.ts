import { Injectable } from '@angular/core';
import { DialogsService } from '@app/core/services/dialogs.service';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { StorageService } from '@app/core/services/storage.service';
import { MenuItem } from '@app/shared';
import { ClipboardService } from '.';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuBuilderService {
  private contextMenuItems: MenuItem[] = [];

  constructor(
    private readonly storageService: StorageService,
    private readonly hotkeyService: HotkeyService,
    private readonly dialogsService: DialogsService,
    private readonly clipboardService: ClipboardService
  ) {}

  buildGroupContextMenuItems(configuration: { isRoot: boolean } = { isRoot: false }): this {
    this.contextMenuItems = [
      {
        label: 'Add subgroup',
        icon: 'pi pi-fw pi-plus',
        command: () => this.storageService.addGroup(),
      },
      {
        separator: true,
      },
      {
        label: 'Rename',
        disabled: configuration.isRoot,
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.storageService.renameGroup(true);
        }
      },
      {
        label: 'Delete',
        disabled: configuration.isRoot,
        icon: 'pi pi-fw pi-trash',
        command: () => this.dialogsService.openDeleteGroupWindow(),
      },
    ];

    return this;
  }
  
  buildRemoveEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyService.configuration.deleteLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.dialogsService.openDeleteEntryWindow();
      }
    });

    return this;
  }

  buildCopyUsernameEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Copy username',
      command: () => {
        this.clipboardService.copyToClipboard(
          this.storageService.selectedPasswords[0],
          'username',
          this.storageService.selectedPasswords[0].username
        );
      }
    });

    return this;
  }

  buildCopyPasswordEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Copy password',
      command: () => {
        this.clipboardService.copyToClipboard(
          this.storageService.selectedPasswords[0],
          'password',
          this.storageService.selectedPasswords[0].password
        );
      }
    });

    return this;
  }

  buildEditEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Edit (Enter)',
      icon: 'pi pi-fw pi-pencil',
      command: () => {
        this.storageService.editedEntry = this.storageService.selectedPasswords[0];
        this.dialogsService.openEntryWindow();
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
