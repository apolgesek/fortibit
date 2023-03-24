import { IHotkeyConfiguration } from '@app/core/models';
import { ModalService } from '@app/core/services/modal.service';
import { IHotkeyHandler } from '../../models/hotkey-handler.model';
import { ClipboardService } from '../clipboard.service';
import { WorkspaceService } from '../workspace.service';
import { EntryManager } from '../managers/entry.manager';
import { GroupManager } from '../managers/group.manager';

export class WindowsHotkeyHandler implements IHotkeyHandler {
  public configuration: IHotkeyConfiguration = {
    deleteLabel: 'Delete (Del)',
    copyPasswordLabel: 'Copy password (Ctrl + Shift + C)',
    copyUsernameLabel: 'Copy username (Ctrl + Shift + U)',
    removeGroupLabel: 'Delete (Del)',
    renameGroupLabel: 'Rename (Ctrl + E)',
    emptyBinLabel: 'Empty recycle bin',
    settingsLabel: 'Settings (Ctrl + .)',
    moveEntryLabel: 'Move (M)'
  };

  constructor(
    private readonly modalService: ModalService,
    private readonly clipboardService: ClipboardService,
    private readonly workspaceService: WorkspaceService,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager
  ) {}

  isMultiselectionKeyDown(event: MouseEvent): boolean {
    return event.ctrlKey;
  }

  intercept(event: KeyboardEvent) {
    if (this.modalService.isAnyModalOpen) {
      return;
    }

    this.registerSaveDatabase(event);
    this.registerDeleteEntry(event);
    this.registerDeleteGroup(event);
    this.registerEditEntry(event);
    this.registerCopyPassword(event);
    this.registerCopyUsername(event);
    this.registerAddEntry(event);
    this.registerSelectAllEntries(event);
    this.registerFindEntries(event);
    this.registerFindGlobalEntries(event);
    this.registerLockDatabase(event)
    this.registerRenameGroup(event);
    this.registerAddGroup(event);
    this.registerMoveEntry(event);
    this.registerOpenSettings(event);
  }
  
  public registerSaveDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 's' && event.ctrlKey) {
      if (!this.workspaceService.file) {
        this.modalService.openMasterPasswordWindow()
      } else if (!this.workspaceService.isSynced) {
        this.workspaceService.saveDatabase();
      }

      event.preventDefault();
    }
  }
  
  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.key === 'Delete' && this.entryManager.selectedPasswords.length) {
      this.modalService.openDeleteEntryWindow();
      event.preventDefault();
    }
  }

  public registerDeleteGroup(event: KeyboardEvent) {
    if (event.key === 'Delete'
      && this.groupManager.selectedGroup
      && !this.groupManager.builtInGroups.map(x => x.id).includes(this.groupManager.selectedGroup)
      && this.entryManager.selectedPasswords.length === 0) {
      this.modalService.openDeleteGroupWindow();
      event.preventDefault();
    }
  }

  public registerRenameGroup(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'e'
      && event.ctrlKey
      && this.groupManager.selectedGroup
      && !this.groupManager.builtInGroups.map(x => x.id).includes(this.groupManager.selectedGroup)) {
      this.modalService.openGroupWindow('edit');
      event.preventDefault();
    }
  }
  
  public registerEditEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'e' && !event.ctrlKey && this.entryManager.selectedPasswords.length) {
      this.modalService.openEditEntryWindow();
      event.preventDefault();
    }
  }

  public registerMoveEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'm' && this.entryManager.selectedPasswords.length) {
      this.modalService.openMoveEntryWindow();
      event.preventDefault();
    }
  }

  public registerCopyPassword(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'c'
      && event.ctrlKey
      && event.shiftKey
      && this.entryManager.selectedPasswords.length === 1) {
      this.clipboardService.copyToClipboard(this.entryManager.selectedPasswords[0], 'password');
      event.preventDefault();
    }
  }

  public registerCopyUsername(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'u' && event.ctrlKey && event.shiftKey && this.entryManager.selectedPasswords.length === 1) {
      this.clipboardService.copyToClipboard(this.entryManager.selectedPasswords[0], 'username');
      event.preventDefault();
    }
  }
  
  public registerAddEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'i' && event.ctrlKey && this.groupManager.isAddAllowed) {
      this.modalService.openNewEntryWindow();
      event.preventDefault();
    }
  }

  public registerAddGroup(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'o' && event.ctrlKey) {
      this.modalService.openGroupWindow();
      event.preventDefault();
    }
  }
  
  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'a' && event.ctrlKey && this.entryManager.selectedPasswords.length) {
      this.entryManager.selectedPasswords = [];
      this.entryManager.selectedPasswords.push(...this.entryManager.passwordEntries);
      event.preventDefault();
    }
  }

  public registerFindEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey && !event.shiftKey) {
      this.entryManager.isGlobalSearch = false;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerFindGlobalEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey && event.shiftKey) {
      this.entryManager.isGlobalSearch = true;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerLockDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'l' && event.ctrlKey && this.workspaceService.file) {
      this.workspaceService.lock({ minimize: true });
      event.preventDefault();
    }
  }

  public registerOpenSettings(event: KeyboardEvent) {
    if (event.key.toLowerCase() === '.' && event.ctrlKey) {
      this.modalService.openSettingsWindow();
      event.preventDefault();
    }
  }
}