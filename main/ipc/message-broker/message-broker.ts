/* eslint-disable @typescript-eslint/no-explicit-any */
import { IpcChannel } from '@shared-renderer/index';
import { BrowserWindow } from 'electron';
import { IMessageBroker } from '.';

export class MessageBroker implements IMessageBroker {
	send(window: BrowserWindow, channel: IpcChannel, ...args: any[]): void {
		window.webContents.send(channel, ...args);
	}
}
