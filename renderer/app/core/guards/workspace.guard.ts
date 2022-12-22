import { Inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { IpcChannel } from '@shared-renderer/index';
import { CommunicationService } from 'injection-tokens';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ICommunicationService } from '../models';
import { WorkspaceService } from '../services';

@Injectable({providedIn: 'root'})
export class WorkspaceGuard implements CanActivate {
  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly workspaceService: WorkspaceService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return from(this.communicationService.ipcRenderer.invoke(IpcChannel.CheckOpenMode))
      .pipe(
        map((filePath: string) => {
          if (filePath) {
            this.workspaceService.file = { filePath: filePath, filename: this.workspaceService.getFileName(filePath) };
            
            if (this.workspaceService.isLocked) {
              this.router.navigate(['/pass']);

              return false;
            } else {
              return true;
            }
          }

          this.workspaceService.isLocked = false;

          return true;
      }));
  }
}