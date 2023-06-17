import { IHistoryEntry } from "@shared-renderer/history-entry.model";
import { IDbTable } from "../database";

export type HistoryEntryPredicateFn = (entry: IHistoryEntry, rows: IDbTable<IHistoryEntry, number>) => boolean;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IHistoryRepository {

}
