import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ElectronService } from '@app/core/services';
import { StorageService } from '@app/core/services/storage.service';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthRequiredResolver implements CanActivate {
  constructor(
    private router: Router,
    private electronService: ElectronService,
    private storageService: StorageService
  ) {}

  canActivate(): Observable<boolean> {
    return from(this.electronService.ipcRenderer.invoke('appOpenType'))
      .pipe(
        tap((result) => {
          if (result) {
            this.storageService.file = result;
            this.router.navigate(['/home']);
          } 
        }),
        map((result) => !result)
      );
  }
}