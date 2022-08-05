import { IHotkeyConfiguration } from '@app/core/models';
import { ModalService } from '@app/core/services/modal.service';
import { StorageService } from '@app/core/services/storage.service';
import { IHotkeyHandler } from '../../models/hotkey-handler.model';
import { ClipboardService } from '../clipboard.service';

export class WindowsHotkeyHandler implements IHotkeyHandler {
  public configuration: IHotkeyConfiguration = {
    deleteLabel: 'Delete (Del)',
    copyPasswordLabel: 'Copy password (Ctrl + Shift + C)',
    copyUsernameLabel: 'Copy username (Ctrol + Shift + U)',
    removeGroupLabel: 'Delete (Del)',
    renameGroupLabel: 'Rename (Ctrl + E)',
    addGroupLabel: 'Add subgroup (Ctrl + O)'
  };

  constructor(
    private readonly storageService: StorageService,
    private readonly modalService: ModalService,
    private readonly clipboardService: ClipboardService
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
  }
  
  public registerSaveDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 's' && event.ctrlKey) {
      if (!this.storageService.file) {
        this.modalService.openMasterPasswordWindow()
      } else if (!this.storageService.dateSaved) {
        this.storageService.saveDatabase(null, { notify: true });
      }

      event.preventDefault();
    }
  }
  
  public registerDeleteEntry(event: KeyboardEvent) {
    if (event.key === 'Delete' && this.storageService.selectedPasswords.length) {
      this.modalService.openDeleteEntryWindow();
      event.preventDefault();
    }
  }

  public registerDeleteGroup(event: KeyboardEvent) {
    if (event.key === 'Delete' && this.storageService.selectedCategory && this.storageService.selectedCategory.id !== 1 && document.querySelector('.tree-focused')) {
      this.modalService.openDeleteGroupWindow();
      event.preventDefault();
    }
  }

  public registerRenameGroup(event: KeyboardEvent) {
    if (event.key === 'e' && event.ctrlKey && this.storageService.selectedCategory && this.storageService.selectedCategory.id !== 1 && document.querySelector('.tree-focused')) {
      this.storageService.renameGroup(true);
      event.preventDefault();
    }
  }
  
  public registerEditEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'e' && this.storageService.selectedPasswords.length === 1) {
      this.storageService.editedEntry = this.storageService.selectedPasswords[0];
      this.modalService.openEntryWindow();
      event.preventDefault();
    }
  }

  public registerCopyPassword(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'c' && event.ctrlKey && event.shiftKey && this.storageService.selectedPasswords.length === 1) {
      this.clipboardService.copyToClipboard(this.storageService.selectedPasswords[0], 'password');
      event.preventDefault();
    }
  }

  public registerCopyUsername(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'u' && event.ctrlKey && event.shiftKey && this.storageService.selectedPasswords.length === 1) {
      this.clipboardService.copyToClipboard(this.storageService.selectedPasswords[0], 'username');
      event.preventDefault();
    }
  }
  
  public registerAddEntry(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'i' && event.ctrlKey && !event.shiftKey) {
      this.modalService.openEntryWindow();
      event.preventDefault();
    }
  }

  public registerAddGroup(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'o' && event.ctrlKey) {
      this.storageService.addGroup();
      event.preventDefault();
    }
  }
  
  public registerSelectAllEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'a' && event.ctrlKey && this.storageService.selectedPasswords.length) {
      this.storageService.selectedPasswords = [];
      this.storageService.selectedPasswords.push(...this.storageService.passwordEntries);
      event.preventDefault();
    }
  }

  public registerFindEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey) {
      this.storageService.isGlobalSearch = false;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerFindGlobalEntries(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f' && event.ctrlKey && event.shiftKey) {
      this.storageService.isGlobalSearch = true;
      (document.querySelector('.search') as HTMLInputElement).focus();
      event.preventDefault();
    }
  }

  public registerLockDatabase(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'l' && event.ctrlKey && this.storageService.file) {
      this.storageService.lock({ minimize: true });
      event.preventDefault();
    }
  }
}