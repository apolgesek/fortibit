import { EntryBase } from './entry-base.model';

export type CardEntry = EntryBase & {
	type: 'card';
	cardholderName: string;
	number: string;
	expirationMonth: number;
	expirationYear: number;
	securityCode: string;
	notes?: string;
};
