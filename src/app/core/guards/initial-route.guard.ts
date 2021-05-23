import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { IpcChannel } from '@shared-models/*';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ElectronService, StorageService } from '../services';
@Injectable()
export class InitialRouteGuard implements CanActivate {
  constructor(
    private router: Router,
    private electronService: ElectronService,
    private storageService: StorageService
  ) {}

  canActivate(): Observable<boolean> {
    return from(this.electronService.ipcRenderer.invoke(IpcChannel.CheckOpenMode))
      .pipe(tap(fileLoaded => {
        if (fileLoaded) {
          this.storageService.file = fileLoaded;
          this.router.navigate(['/home']);
        }
      }), map(fileLoaded => !fileLoaded));
  }
}