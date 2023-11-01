export enum Key {
	Tab,
	Enter,
}

export class KeyCode {
	public static TAB = KeyCode.getKeyCode(Key.Tab);
	public static ENTER = KeyCode.getKeyCode(Key.Enter);

	private static _keyMap: { [key: number]: number };

	private static getKeyCode(key: Key): number {
		if (!KeyCode._keyMap) {
			switch (process.platform) {
				case "win32":
					KeyCode._keyMap = {
						[Key.Tab]: 9,
						[Key.Enter]: 13,
					};
					break;
				case "darwin":
					KeyCode._keyMap = {
						[Key.Tab]: 48,
						[Key.Enter]: 76,
					};
					break;
				default:
					throw new Error("Key Code: Unsupported platform");
			}
		}

		return KeyCode._keyMap[key];
	}
}
