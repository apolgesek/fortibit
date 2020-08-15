import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ElectronService } from '@app/core/services';
import { DatabaseService } from '@app/core/services/database.service';

@Injectable({
  providedIn: 'root',
})
export class FileOpenModeGuard implements CanActivate {
  constructor(
    private router: Router,
    private electronService: ElectronService,
    private passwordService: DatabaseService
  ) {}

  async canActivate(): Promise<boolean> {
    const result = await this.electronService.ipcRenderer.invoke('appOpenType');
    if (result) {
      this.passwordService.file = result;
      this.router.navigateByUrl('/home');
      return Promise.resolve(false);
    } else {
      return Promise.resolve(true);
    }
  }
}