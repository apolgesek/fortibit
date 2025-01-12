import { MessageEventType } from '../../encryption';

export type EventPayload =
	| DecryptDatabaseEventPayload
	| EncryptDatabaseEventPayload
	| EncryptStringEventPayload
	| DecryptStringEventPayload
	| BulkDecryptStringEventPayload
	| GetLeaksEventPayload
	| GetWeakPasswordsEventPayload;

export type DecryptDatabaseEventPayload = {
	type: MessageEventType.DecryptDatabase;
	data: string;
	password: string;
};

export type EncryptDatabaseEventPayload = {
	type: MessageEventType.EncryptDatabase;
	schemaVersion: number;
	database: string;
	password: string;
};

export type EncryptStringEventPayload = {
	type: MessageEventType.EncryptString;
	plain: string;
};

export type DecryptStringEventPayload = {
	type: MessageEventType.DecryptString;
	encrypted: string;
};

export type BulkDecryptStringEventPayload = {
	type: MessageEventType.BulkDecryptString;
	rows: string;
};

export type GetLeaksEventPayload = {
	type: MessageEventType.GetLeaks;
	database: string;
};

export type GetWeakPasswordsEventPayload = {
	type: MessageEventType.GetWeakPasswords;
	database: string;
};
