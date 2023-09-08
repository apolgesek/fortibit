import { IHotkeyConfiguration } from '@app/core/models';
import { ModalService } from '@app/core/services/modal.service';
import { IHotkeyHandler } from '../../models/hotkey-handler.model';
import { ClipboardService } from '../clipboard.service';
import { WorkspaceService } from '../workspace.service';
import { EntryManager } from '../managers/entry.manager';
import { GroupManager } from '../managers/group.manager';

export class DarwinHotkeyHandler implements IHotkeyHandler {
  public configuration: IHotkeyConfiguration = {
    deleteLabel: 'Delete (⌘ + Backspace)',
    copyPasswordLabel: 'Copy password (⌘ + Shift + C)',
    copyUsernameLabel: 'Copy username (⌘ + Shift + U)',
    removeGroupLabel: 'Delete (⌘ + Backspace)',
    renameGroupLabel: 'Rename (⌘ + E)',
    emptyBinLabel: 'Empty recycle bin',
    settingsLabel: 'Settings (⌘ + .)',
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
    return event.metaKey;
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
    this.registerLockDatabase(event);
    this.registerRenameGroup(event);
    this.registerAddGroup(event);
    this.registerMoveEntry(event);
    this.registerOpenSettings(event);
  }

  public registerSaveDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 's' && event.metaKey) {
      if (!this.workspaceService.isSynced) {
        this.workspaceService.saveDatabase();
      }

      event.preventDefault();
    }
  }

  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.metaKey && event.key === 'Backspace' && this.entryManager.selectedPasswords.length) {
      this.modalService.openDeleteEntryWindow();
      event.preventDefault();
    }
  }

  public registerDeleteGroup(event: KeyboardEvent) {
    if (event.metaKey && event.key === 'Backspace'
      && this.groupManager.selectedGroup
      && !this.groupManager.builtInGroups.map(x => x.id).includes(this.groupManager.selectedGroup)
      && this.entryManager.selectedPasswords.length === 0) {
      this.modalService.openDeleteGroupWindow();
      event.preventDefault();
    }
  }

  public registerRenameGroup(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'e'
      && event.metaKey
      && this.groupManager.selectedGroup
      && !this.groupManager.builtInGroups.map(x => x.id).includes(this.groupManager.selectedGroup)) {
      this.modalService.openGroupWindow('edit');
      event.preventDefault();
    }
  }

  public registerEditEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'e' && !event.metaKey && this.entryManager.selectedPasswords.length === 1) {
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
      && event.metaKey
      && event.shiftKey
      && this.entryManager.selectedPasswords.length === 1) {
      this.clipboardService.copyEntryDetails(this.entryManager.selectedPasswords[0], 'password');
      event.preventDefault();
    }
  }

  public registerCopyUsername(event: KeyboardEvent) {
    if (
      event.key.toLowerCase() === 'u'
      && event.metaKey
      && event.shiftKey
      && this.entryManager.selectedPasswords.length === 1
    ) {
      this.clipboardService.copyEntryDetails(this.entryManager.selectedPasswords[0], 'username');
      event.preventDefault();
    }
  }

  public registerAddEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'i' && event.metaKey && this.groupManager.isAddAllowed) {
      this.modalService.openNewEntryWindow();
      event.preventDefault();
    }
  }

  public registerAddGroup(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'o' && event.metaKey) {
      this.modalService.openGroupWindow();
      event.preventDefault();
    }
  }

  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'a' && event.metaKey && this.entryManager.selectedPasswords.length) {
      this.entryManager.selectedPasswords = [];
      this.entryManager.selectedPasswords.push(...this.entryManager.passwordEntries);
      event.preventDefault();
    }
  }

  public registerFindEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey) {
      this.entryManager.isGlobalSearch = false;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerFindGlobalEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'g' && event.ctrlKey) {
      this.entryManager.isGlobalSearch = true;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerLockDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'l' && event.metaKey && this.workspaceService.file) {
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
