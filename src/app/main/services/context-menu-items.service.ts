import { Injectable } from '@angular/core';
import { HotkeyService, PasswordStoreService } from '@app/core/services';
import { MenuItem } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuItemsService {

  constructor(
    private passwordStore: PasswordStoreService,
    private hotkeyService: HotkeyService,
  ) { }

  buildGroupContextMenuItems(): MenuItem[] {
    return [
      {
        label: 'Add subgroup',
        icon: 'pi pi-fw pi-plus',
        command: () => this.passwordStore.addSubgroup(),
      },
      {
        separator: true,
      },
      {
        label: 'Rename',
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.passwordStore.renameGroup();
          requestAnimationFrame(() => {
            (<HTMLInputElement>document.querySelector('.group-name-input')).focus();
          });
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-fw pi-trash',
        command: () => this.passwordStore.openDeleteGroupWindow(),
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
          this.passwordStore.copyToClipboard(
            this.passwordStore.selectedPasswords[0],
            this.passwordStore.selectedPasswords[0].username
          );
        }
      },
      {
        label: 'Copy password',
        command: () => {
          this.passwordStore.copyToClipboard(
            this.passwordStore.selectedPasswords[0],
            this.passwordStore.selectedPasswords[0].username
          );
        }
      },
      { separator: true },
      {
        label: 'Edit (Enter)',
        visible: this.passwordStore.selectedPasswords.length === 0,
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.passwordStore.openEditEntryWindow();
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
          label: 'Move top (Ctrl + ↑)',
          icon: 'pi pi-fw pi-angle-double-up',
          command: () => this.passwordStore.moveTop()
        },
        {
          label: 'Move up (Alt + ↑)',
          icon: 'pi pi-fw pi-angle-up',
          command: () => this.passwordStore.moveUp()
        },
        {
          label: 'Move down (Alt + ↓)',
          icon: 'pi pi-fw pi-angle-down',
          command: () => this.passwordStore.moveDown()
        },
        {
          label: 'Move bottom (Ctrl + ↓)',
          icon: 'pi pi-fw pi-angle-double-down',
          command: () => this.passwordStore.moveBottom()
        }
      ]
    }
  };
  
  private buildRemoveEntryContextMenuItem(): MenuItem {
    return {
      label: this.hotkeyService.deleteShortcutLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.passwordStore.openDeleteEntryWindow();
      }
    }
  };
}
