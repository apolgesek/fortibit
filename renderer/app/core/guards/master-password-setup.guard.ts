import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WorkspaceService } from '../services';

export function masterPasswordSetupGuard(): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
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
      }),
      switchMap((allow) => {
        if (allow && !route.queryParams.explicitNew) {
          return from(workspaceService.setupDatabase());
        } else if (allow) {
          return of(true);
        }

        return of(false);
      })
    );
  }
}
