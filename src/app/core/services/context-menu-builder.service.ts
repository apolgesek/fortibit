import { Injectable } from '@angular/core';
import { CoreService } from '@app/core/services/core.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { StorageService } from '@app/core/services/storage.service';
import { MenuItem } from 'primeng-lts/api';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuBuilderService {

  private contextMenuItems: MenuItem[] = [];

  constructor(
    private storageService: StorageService,
    private hotkeyService: HotkeyService,
    private dialogsService: DialogsService,
    private coreService: CoreService
  ) {
  }

  buildGroupContextMenuItems(): this {
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
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.storageService.renameGroup();
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-fw pi-trash',
        command: () => this.dialogsService.openDeleteGroupWindow(),
      },
    ];

    return this;
  };
  
  buildRearrangeEntriesContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Rearrange',
      items: [
        {
          label: this.hotkeyService.configuration.moveTopLabel,
          icon: 'pi pi-fw pi-angle-double-up',
          command: () => this.storageService.moveTop()
        },
        {
          label: 'Move up (Alt + ↑)',
          icon: 'pi pi-fw pi-angle-up',
          command: () => this.storageService.moveUp()
        },
        {
          label: 'Move down (Alt + ↓)',
          icon: 'pi pi-fw pi-angle-down',
          command: () => this.storageService.moveDown()
        },
        {
          label: this.hotkeyService.configuration.moveBottomLabel,
          icon: 'pi pi-fw pi-angle-double-down',
          command: () => this.storageService.moveBottom()
        }
      ]
    });

    return this;
  };
  
  buildRemoveEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyService.configuration.deleteLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.dialogsService.openDeleteEntryWindow();
      }
    });

    return this;
  };

  buildCopyUsernameEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Copy username',
      command: () => {
        this.coreService.copyToClipboard(
          this.storageService.selectedPasswords[0],
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
        this.coreService.copyToClipboard(
          this.storageService.selectedPasswords[0],
          this.storageService.selectedPasswords[0].password
        );
      }
    });

    return this;
  }

  buildEditEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Edit (Enter)',
      visible: this.storageService.selectedPasswords.length === 0,
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
