import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { IpcChannel } from '@shared-renderer/index';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';

@Injectable()
export class DashboardGuard implements CanActivate {
  constructor(
    private readonly electronService: ElectronService,
    private readonly storageService: StorageService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return from(this.electronService.ipcRenderer.invoke(IpcChannel.CheckOpenMode))
      .pipe(
        map((filePath: string) => {
          if (filePath) {
            this.storageService.file = { filePath: filePath, filename: filePath.split('\\').slice(-1)[0] };
            
            if (this.storageService.isLocked) {
              this.router.navigate(['/home']);

              return false;
            } else {
              return true;
            }
          }

          this.storageService.isLocked = false;

          return true;
      }));
  }
}