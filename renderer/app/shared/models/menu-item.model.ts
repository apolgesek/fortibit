export type MenuItem = {
	label?: string;
	separator?: boolean;
	disabled?: boolean | (() => boolean);
	command?: (event: Event) => void;
};
