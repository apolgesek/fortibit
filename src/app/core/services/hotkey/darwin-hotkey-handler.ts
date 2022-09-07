import { IHotkeyConfiguration } from '@app/core/models';
import { ModalService } from '@app/core/services/modal.service';
import { IHotkeyHandler } from '../../models/hotkey-handler.model';
import { ClipboardService } from '../clipboard.service';
import { WorkspaceService } from '../workspace.service';
import { EntryManager } from '../managers/entry.manager';
import { GroupManager } from '../managers/group.manager';

export class DarwinHotkeyHandler implements IHotkeyHandler {
  public configuration: IHotkeyConfiguration = {
    deleteLabel: 'Delete (Del)',
    copyPasswordLabel: 'Copy password (Ctrl + Shift + C)',
    copyUsernameLabel: 'Copy username (Ctrol + Shift + U)',
    removeGroupLabel: 'Delete (Del)',
    renameGroupLabel: 'Rename (Ctrl + E)',
    addGroupLabel: 'Add subgroup (Ctrl + O)',
    emptyBinLabel: 'Empty recycle bin'
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
  }

  registerSaveDatabase: (event: KeyboardEvent) => void;
  registerDeleteEntry: (event: KeyboardEvent) => void;
  registerDeleteGroup: (event: KeyboardEvent) => void;
  registerRenameGroup: (event: KeyboardEvent) => void;
  registerEditEntry: (event: KeyboardEvent) => void;
  registerAddEntry: (event: KeyboardEvent) => void;
  registerCopyPassword: (event: KeyboardEvent) => void;
  registerCopyUsername: (event: KeyboardEvent) => void;
  registerSelectAllEntries: (event: KeyboardEvent) => void;
  registerFindEntries: (event: KeyboardEvent) => void;
  registerFindGlobalEntries: (event: KeyboardEvent) => void;
  registerLockDatabase: (event: KeyboardEvent) => void;
  registerAddGroup: (event: KeyboardEvent) => void;
}