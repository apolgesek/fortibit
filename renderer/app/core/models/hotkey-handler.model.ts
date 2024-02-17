import { HotkeyLabel } from '../services/hotkey/hotkey-label';

export interface IHotkeyHandler {
	isMultiselectionKeyDown: (event: Event) => boolean;
	intercept: (event: KeyboardEvent) => void;
	getContextMenuLabel: (label: keyof typeof HotkeyLabel) => string;
	get hotkeysMap(): { [key in keyof Partial<typeof HotkeyLabel>]: string };

	saveDatabase: () => void;
	deleteEntry: () => void;
	deleteGroup: () => void;
	renameGroup: () => void;
	editEntry: () => void;
	moveEntry: () => void;
	addEntry: () => void;
	copyPassword: () => void;
	copyUsername: () => void;
	selectAllEntries: () => void;
	findEntries: () => void;
	findGlobalEntries: () => void;
	lockDatabase: () => void;
	addGroup: () => void;
	openSettings: () => void;
	toggleFullscreen: () => void;
}
