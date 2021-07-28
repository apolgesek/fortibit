import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { IpcChannel } from '@shared-models/*';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ElectronService, StorageService } from '../services';
@Injectable()
export class InitialRouteGuard implements CanActivate {
  constructor(
    private electronService: ElectronService,
    private storageService: StorageService,
    private router: Router
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