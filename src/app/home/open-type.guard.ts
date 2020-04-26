import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { ElectronService } from '@app/core/services';
import { PasswordStoreService } from '@app/core/services/password-store.service';

@Injectable({
  providedIn: 'root',
})
export class OpenTypeGuard implements CanActivate {

    constructor(
        private router: Router,
        private electronService: ElectronService,
        private passwordService: PasswordStoreService
    ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean> {
    return this.electronService.ipcRenderer.invoke('appOpenType').then((result) => {
        if (result) {
            this.passwordService.filePath = result;
            this.router.navigateByUrl('/home');
            return Promise.resolve(false);
        } else {
            return Promise.resolve(true);
        }
    });
  }
}