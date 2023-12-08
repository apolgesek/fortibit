import { PasswordEntry } from "./password-entry.model";

export type HistoryEntry = {
  entry: PasswordEntry;
  entryId?: number;
  id?: number;
}