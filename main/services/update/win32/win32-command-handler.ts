import { spawn } from 'child_process';
import { app } from 'electron';
import { ICommandHandler } from '../command-handler.model';

export class Win32CommandHandler implements ICommandHandler {
	updateApp(filePath: string, updateDirectory: string) {
		spawn(filePath, ['/R'], {
			cwd: updateDirectory,
			detached: true,
			stdio: ['ignore', 'ignore', 'ignore'],
			windowsVerbatimArguments: true,
		});

		app.exit();
	}
}
