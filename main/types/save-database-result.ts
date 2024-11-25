export type SaveDatabaseResult = {
	status: boolean;
	file?: string;
	notify?: boolean;
	error?: Error;
};