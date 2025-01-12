import { createServiceDecorator } from '../../di';
import { IpcChannel } from '@shared-renderer/index';
import { BrowserWindow } from 'electron';

export const IMessageBroker =
	createServiceDecorator<IMessageBroker>('messageBroker');

export interface IMessageBroker {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	send(window: BrowserWindow, channel: IpcChannel, ...args: any[]): void;
}
