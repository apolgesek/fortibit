import { IEntryGroup } from "./entry-group";
import { IHistoryEntry } from "./history-entry.model";
import { IPasswordEntry } from "./password-entry.model";
import { IReport } from "./report.model";

export interface VaultSchema {
  schemaVersion: number;
  tables: {
    entries: IPasswordEntry[];
    groups: IEntryGroup[];
    history: IHistoryEntry[];
    reports: IReport[];
  }
}