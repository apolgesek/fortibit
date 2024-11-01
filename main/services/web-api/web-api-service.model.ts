import { PasswordEntry } from '../../../shared';
import { createServiceDecorator } from '../../di';

export const IWebApiService =
	createServiceDecorator<IWebApiService>('webApiService');

export interface IWebApiService {
	checkSecureProtocol(windowId: number, entries: PasswordEntry[]);
	checkTfa(windowId: number, entries: PasswordEntry[]);
}
