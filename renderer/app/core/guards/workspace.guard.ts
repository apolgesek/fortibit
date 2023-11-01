import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkspaceService } from '../services';

export function workspaceGuard(): CanActivateFn {
  return () => {
    const messageBroker = inject(MessageBroker);
    const workspaceService = inject(WorkspaceService);
    const fileNamePipe = inject(FileNamePipe);
    const router = inject(Router);

    return from(messageBroker.ipcRenderer.invoke(IpcChannel.CheckOpenMode))
    .pipe(
      map((filePath: string) => {
        if (filePath) {
          workspaceService.file = { filePath, filename: fileNamePipe.transform(filePath) };

          if (workspaceService.isLocked) {
            router.navigate(['/pass']);

            return false;
          } else {
            return true;
          }
        }

        return true;
      }));
  }
}
