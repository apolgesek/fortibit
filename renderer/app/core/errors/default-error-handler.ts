import { ErrorHandler } from '@angular/core';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';

export class DefaultErrorHandler implements ErrorHandler {
	handleError(error: Error): void {
		console.error(error);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).api.send(
			IpcChannel.LogError,
			new Date().toISOString() +
				': ' +
				JSON.stringify(error, Object.getOwnPropertyNames(error)) +
				'\n\n',
		);
	}
}
