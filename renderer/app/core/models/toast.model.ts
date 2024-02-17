export type Toast = {
	message: string;
	type: 'success' | 'error';
	alive?: number;
	showCount?: boolean;
	class?: string;
	style?: string;
};
