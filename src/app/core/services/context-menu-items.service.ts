import { Injectable } from '@angular/core';
import { HotkeyService, StorageService } from '@app/core/services';
import { MenuItem } from 'primeng/api';
import { DialogsService } from '@app/core/services/dialogs.service';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuItemsService {

  constructor(
    private storageService: StorageService,
    private hotkeyService: HotkeyService,
    private dialogsService: DialogsService
  ) { }

  buildGroupContextMenuItems(): MenuItem[] {
    return [
      {
        label: 'Add subgroup',
        icon: 'pi pi-fw pi-plus',
        command: () => this.storageService.addSubgroup(),
      },
      {
        separator: true,
      },
      {
        label: 'Rename',
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.storageService.renameGroup();
          requestAnimationFrame(() => {
            (<HTMLInputElement>document.querySelector('.group-name-input')).focus();
          });
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-fw pi-trash',
        command: () => this.dialogsService.openDeleteGroupWindow(),
      },
    ]
  };
  
  buildMultiEntryContextMenuItems(): MenuItem[] {
    return [
      this.buildRearrangeEntriesContextMenuItem(),
      this.buildRemoveEntryContextMenuItem()
    ]
  };
  
  buildEntryContextMenuItems(): MenuItem[] {
    return [
      this.buildRearrangeEntriesContextMenuItem(),
      {
        label: 'Copy username',
        command: () => {
          this.storageService.copyToClipboard(
            this.storageService.selectedPasswords[0],
            this.storageService.selectedPasswords[0].username
          );
        }
      },
      {
        label: 'Copy password',
        command: () => {
          this.storageService.copyToClipboard(
            this.storageService.selectedPasswords[0],
            this.storageService.selectedPasswords[0].username
          );
        }
      },
      { separator: true },
      {
        label: 'Edit (Enter)',
        visible: this.storageService.selectedPasswords.length === 0,
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.storageService.editedEntry = this.storageService.selectedPasswords[0];
          this.dialogsService.openEntryWindow();
        }
      },
      this.buildRemoveEntryContextMenuItem()
    ]
  };
  
  private buildRearrangeEntriesContextMenuItem(): MenuItem {
    return {
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
    }
  };
  
  private buildRemoveEntryContextMenuItem(): MenuItem {
    return {
      label: this.hotkeyService.configuration.deleteLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.dialogsService.openDeleteEntryWindow();
      }
    }
  };
}
