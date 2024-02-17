import { ComponentRef } from '@angular/core';
import { HistoryEntry } from '@shared-renderer/index';

export interface IModal {
	ref: ComponentRef<unknown>;
	additionalData?: IAdditionalData;
	showBackdrop?: boolean;
	close: () => void;
}

export interface IAdditionalData<P = any> {
	payload?: P;
	closeOnBackdropClick?: boolean;
}

export type EntryDialogDataPayload = {
	decryptedPassword: string;
	config?: {
		readonly: boolean;
	};
	historyEntry?: HistoryEntry;
};
