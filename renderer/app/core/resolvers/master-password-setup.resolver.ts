import { inject } from '@angular/core';
import {
	ActivatedRouteSnapshot,
	ResolveFn,
	RouterStateSnapshot,
} from '@angular/router';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { from, map } from 'rxjs';
import { WorkspaceService } from '../services';

export function masterPasswordSetupResolver(): ResolveFn<string> {
	return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
		const messageBroker = inject(MessageBroker);
		const workspaceService = inject(WorkspaceService);
		const fileNamePipe = inject(FileNamePipe);

		return from(
			messageBroker.ipcRenderer.invoke(IpcChannel.CheckOpenMode),
		).pipe(
			map((filePath: string) => {
				if (filePath) {
					workspaceService.file = {
						filePath,
						filename: fileNamePipe.transform(filePath),
					};

					return filePath;
				}
			}),
		);
	};
}
