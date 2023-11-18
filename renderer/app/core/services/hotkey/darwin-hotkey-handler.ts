import { ClipboardService } from '../clipboard.service';
import { EntryManager } from '../managers/entry.manager';
import { GroupManager } from '../managers/group.manager';
import { ModalService } from '../modal.service';
import { WorkspaceService } from '../workspace.service';
import { HotkeyHandler } from './hotkey-handler';

export class DarwinHotkeyHandler extends HotkeyHandler {
  protected keyMap: (event: KeyboardEvent) => string[] = (event: KeyboardEvent) => {
    return [event.metaKey, event.shiftKey, event.key].map((x, idx) => {
      switch (idx) {
        case 0:
          return x ? '⌘' : null;
        case 1:
          return x ? 'shift' : null;
        case 2:
          return (x as string).toLowerCase();
      }
    });
  };

  constructor(
    protected readonly modalService: ModalService,
    protected readonly clipboardService: ClipboardService,
    protected readonly workspaceService: WorkspaceService,
    protected readonly entryManager: EntryManager,
    protected readonly groupManager: GroupManager
  ) {
    super(modalService, clipboardService, workspaceService, entryManager, groupManager);

    this.registerHotkey('Delete', [this.deleteEntry, this.deleteGroup], { labelId: 'Remove' });
    this.registerHotkey('F11', this.toggleFullscreen, { labelId: 'ToggleFullscreen' });
    this.registerHotkey('⌘+A', this.selectAllEntries);
    this.registerHotkey('⌘+E', this.editEntry, { labelId: 'Edit' });
    this.registerHotkey('⌘+F', this.findEntries, { labelId: 'FindInGroup' });
    this.registerHotkey('⌘+G', this.openGenerator, { labelId: 'Generator' });
    this.registerHotkey('⌘+H', this.openHistory, { labelId: 'History' });
    this.registerHotkey('⌘+L', this.lockDatabase, { labelId: 'Lock' });
    this.registerHotkey('⌘+M', this.moveEntry, { labelId: 'MoveEntry' });
    this.registerHotkey('⌘+N', this.addEntry);
    this.registerHotkey('⌘+O', this.addGroup);
    this.registerHotkey('⌘+R', this.renameGroup, { labelId: 'RenameGroup' });
    this.registerHotkey('⌘+S', this.saveDatabase, { labelId: 'SaveDatabase' });

    this.registerHotkey('⌘+.', this.openSettings, { labelId: 'OpenSettings' });
    this.registerHotkey('⌘+-', this.zoomOut, { labelId: 'ZoomOut' });
    this.registerHotkey('⌘+=', this.zoomIn, { labelId: 'ZoomIn' });
    this.registerHotkey('⌘+0', this.resetZoom, { labelId: 'ResetZoom' });

    this.registerHotkey('⌘+Shift+C', this.copyPassword, { labelId: 'CopyPassword' });
    this.registerHotkey('⌘+Shift+F', this.findGlobalEntries, { labelId: 'FindInVault' });
    this.registerHotkey('⌘+Shift+U', this.copyUsername, { labelId: 'CopyUsername' });
  }
}
