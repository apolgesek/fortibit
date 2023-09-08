import { IPasswordEntry } from "./password-entry.model";

export interface IHistoryEntry {
  entry: IPasswordEntry;
  entryId?: number;
  id?: number;
}