import { Inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '../../../../shared/index';
import { MessageBroker } from 'injection-tokens';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IMessageBroker } from '../models';
import { WorkspaceService } from '../services';

@Injectable({providedIn: 'root'})
export class WorkspaceGuard implements CanActivate {
  constructor(
    @Inject(MessageBroker)
    private readonly messageBroker: IMessageBroker,
    private readonly workspaceService: WorkspaceService,
    private readonly router: Router,
    private readonly fileNamePipe: FileNamePipe
  ) {}

  canActivate(): Observable<boolean> {
    return from(this.messageBroker.ipcRenderer.invoke(IpcChannel.CheckOpenMode))
      .pipe(
        map((filePath: string) => {
          if (filePath) {
            this.workspaceService.file = { filePath, filename: this.fileNamePipe.transform(filePath) };

            if (this.workspaceService.isLocked) {
              this.router.navigate(['/pass']);

              return false;
            } else {
              return true;
            }
          }

          return true;
        }));
  }
}
