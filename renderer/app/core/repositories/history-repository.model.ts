import { HistoryEntry } from '@shared-renderer/history-entry.model';
import { IDbTable } from '../database';

export type HistoryEntryPredicateFn = (
	entry: HistoryEntry,
	rows: IDbTable<HistoryEntry, number>,
) => boolean;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IHistoryRepository {}
