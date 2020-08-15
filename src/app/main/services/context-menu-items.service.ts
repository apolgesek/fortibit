import { Injectable } from '@angular/core';
import { HotkeyService, DatabaseService } from '@app/core/services';
import { MenuItem } from 'primeng/api';
import { DialogsService } from '@app/core/services/dialogs.service';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuItemsService {

  constructor(
    private databaseService: DatabaseService,
    private hotkeyService: HotkeyService,
    private dialogsService: DialogsService
  ) { }

  buildGroupContextMenuItems(): MenuItem[] {
    return [
      {
        label: 'Add subgroup',
        icon: 'pi pi-fw pi-plus',
        command: () => this.databaseService.addSubgroup(),
      },
      {
        separator: true,
      },
      {
        label: 'Rename',
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.databaseService.renameGroup();
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
          this.databaseService.copyToClipboard(
            this.databaseService.selectedPasswords[0],
            this.databaseService.selectedPasswords[0].username
          );
        }
      },
      {
        label: 'Copy password',
        command: () => {
          this.databaseService.copyToClipboard(
            this.databaseService.selectedPasswords[0],
            this.databaseService.selectedPasswords[0].username
          );
        }
      },
      { separator: true },
      {
        label: 'Edit (Enter)',
        visible: this.databaseService.selectedPasswords.length === 0,
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.databaseService.editedEntry = this.databaseService.selectedPasswords[0];
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
          label: 'Move top (Ctrl + ↑)',
          icon: 'pi pi-fw pi-angle-double-up',
          command: () => this.databaseService.moveTop()
        },
        {
          label: 'Move up (Alt + ↑)',
          icon: 'pi pi-fw pi-angle-up',
          command: () => this.databaseService.moveUp()
        },
        {
          label: 'Move down (Alt + ↓)',
          icon: 'pi pi-fw pi-angle-down',
          command: () => this.databaseService.moveDown()
        },
        {
          label: 'Move bottom (Ctrl + ↓)',
          icon: 'pi pi-fw pi-angle-double-down',
          command: () => this.databaseService.moveBottom()
        }
      ]
    }
  };
  
  private buildRemoveEntryContextMenuItem(): MenuItem {
    return {
      label: this.hotkeyService.deleteShortcutLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.dialogsService.openDeleteEntryWindow();
      }
    }
  };
}
