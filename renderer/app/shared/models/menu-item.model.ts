export type MenuItem = {
	label?: string;
	hotkey?: string;
	separator?: boolean;
	disabled?: boolean | (() => boolean);
	command?: (event: Event) => void;
};
