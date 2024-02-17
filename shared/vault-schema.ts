import { EntryGroup } from './entry-group';
import { HistoryEntry } from './history-entry.model';
import { PasswordEntry } from './password-entry.model';
import { Report } from './report.model';

export type VaultSchema = {
	schemaVersion: number;
	tables: {
		entries: PasswordEntry[];
		groups: EntryGroup[];
		history: HistoryEntry[];
		reports: Report[];
	};
};
