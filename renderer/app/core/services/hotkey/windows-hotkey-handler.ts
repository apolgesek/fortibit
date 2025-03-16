import { UiUtil } from '@app/utils';
import { HotkeyHandler } from './hotkey-handler';

export class WindowsHotkeyHandler extends HotkeyHandler {
	protected keyMap: (event: KeyboardEvent) => string[] = (
		event: KeyboardEvent,
	) => {
		return [event.ctrlKey, event.shiftKey, event.altKey, event.key].map(
			(x, idx) => {
				switch (idx) {
					case 0:
						return x ? 'ctrl' : null;
					case 1:
						return x ? 'shift' : null;
					case 2:
						return x ? 'alt' : null;
					case 3:
						return (x as string).toLowerCase();
				}
			},
		);
	};

	constructor() {
		super();

		this.registerHotkey('Delete', [this.deleteEntry, this.deleteGroup], {
			labelId: 'Remove',
		});
		this.registerHotkey('F11', this.toggleFullscreen, {
			labelId: 'ToggleFullscreen',
		});
		this.registerHotkey('Ctrl+A', this.selectAllEntries, {
			preventDefault: UiUtil.isEntryFocused,
		});
		this.registerHotkey('Ctrl+E', this.editEntry, { labelId: 'Edit' });
		this.registerHotkey('Ctrl+F', this.findEntries, { labelId: 'FindInGroup' });
		this.registerHotkey('Ctrl+Alt+F', this.findGlobalEntries, {
			labelId: 'FindInVault',
		});
		this.registerHotkey('Ctrl+G', this.openGenerator, { labelId: 'Generator' });
		this.registerHotkey('Ctrl+H', this.openHistory, { labelId: 'History' });
		this.registerHotkey('Ctrl+L', this.lockDatabase, { labelId: 'Lock' });
		this.registerHotkey('Ctrl+M', this.moveEntry, { labelId: 'MoveEntry' });
		this.registerHotkey('Ctrl+N', this.addEntry, { labelId: 'AddEntry' });
		this.registerHotkey('Ctrl+O', this.addGroup, { labelId: 'AddGroup' });
		this.registerHotkey('Ctrl+R', this.renameGroup, { labelId: 'RenameGroup' });
		this.registerHotkey('Ctrl+S', this.saveDatabase, {
			labelId: 'SaveDatabase',
		});

		this.registerHotkey('Ctrl+.', this.openSettings, {
			labelId: 'OpenSettings',
		});
		this.registerHotkey('Ctrl+-', this.zoomOut, { labelId: 'ZoomOut' });
		this.registerHotkey('Ctrl+=', this.zoomIn, { labelId: 'ZoomIn' });
		this.registerHotkey('Ctrl+0', this.resetZoom, { labelId: 'ResetZoom' });

		this.registerHotkey('Ctrl+Shift+P', this.copyPassword, {
			labelId: 'CopyPassword',
		});
		this.registerHotkey('Ctrl+Shift+U', this.copyUsername, {
			labelId: 'CopyUsername',
		});
		this.registerHotkey('Ctrl+Shift+T', this.copyTotp, {
			labelId: 'CopyTotp',
		});
	}
}
