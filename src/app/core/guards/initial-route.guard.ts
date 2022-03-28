import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { IpcChannel } from '@shared-renderer/index';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';

@Injectable()
export class InitialRouteGuard implements CanActivate {
  constructor(
    private readonly electronService: ElectronService,
    private readonly storageService: StorageService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return from(this.electronService.ipcRenderer.invoke(IpcChannel.CheckOpenMode))
      .pipe(tap((filePath: string) => {
        if (filePath) {
          this.storageService.file = { filePath: filePath, filename: filePath.split('\\').slice(-1)[0] };
          
          // password has not been entered yet - navigate to provide password page
          if (this.storageService.groups.length === 0) {
            this.router.navigate(['/home']);
          }
        }
      }), map(filePath => this.hasAccessedFile(filePath) || !filePath));
  }

  private hasAccessedFile(filePath: string) {
    return Boolean(filePath) && this.storageService.groups.length > 0;
  }
}