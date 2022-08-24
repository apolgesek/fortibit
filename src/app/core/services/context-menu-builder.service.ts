import { Inject, Injectable } from '@angular/core';
import { HotkeyHandler } from '@app/app.module';
import { ModalService } from '@app/core/services/modal.service';
import { StorageService } from '@app/core/services/managers/storage.service';
import { MenuItem } from '@app/shared';
import { ClipboardService } from '.';
import { IHotkeyHandler } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuBuilderService {
  private contextMenuItems: MenuItem[] = [];

  constructor(
    private readonly storageService: StorageService,
    private readonly modalService: ModalService,
    private readonly clipboardService: ClipboardService,
    @Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler
  ) {}

  buildGroupContextMenuItems(configuration: { isRoot: boolean } = { isRoot: false }): this {
    this.contextMenuItems = [
      {
        label: this.hotkeyHandler.configuration.addGroupLabel,
        icon: 'pi pi-fw pi-plus',
        command: () => this.storageService.addGroup(),
      },
      {
        separator: true,
      },
      {
        label: this.hotkeyHandler.configuration.renameGroupLabel,
        disabled: configuration.isRoot,
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.storageService.renameGroup(true);
        }
      },
      {
        label: this.hotkeyHandler.configuration.removeGroupLabel,
        disabled: configuration.isRoot,
        icon: 'pi pi-fw pi-trash',
        command: () => this.modalService.openDeleteGroupWindow(),
      },
    ];

    return this;
  }

  buildEmptyRecycleBinContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.emptyBinLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.storageService.selectedPasswords = [...this.storageService.passwordEntries];
        this.modalService.openDeleteEntryWindow();
      }
    });

    return this;
  }
  
  buildRemoveEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: this.hotkeyHandler.configuration.deleteLabel,
      icon: 'pi pi-fw pi-trash',
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
          this.storageService.selectedPasswords[0],
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
          this.storageService.selectedPasswords[0],
          'password'
        );
      }
    });

    return this;
  }

  buildEditEntryContextMenuItem(): this {
    this.contextMenuItems.push({
      label: 'Edit (E)',
      icon: 'pi pi-fw pi-pencil',
      command: () => {
        this.modalService.openEditEntryWindow();
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
