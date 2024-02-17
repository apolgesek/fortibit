import { EncryptionEvent } from './event.model';

export type GetLeaksEvent = EncryptionEvent & {
	database: string;
};
