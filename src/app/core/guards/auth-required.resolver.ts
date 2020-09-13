import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { ElectronService } from '@app/core/services';
import { StorageService } from '@app/core/services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthRequiredResolver implements Resolve<boolean> {
  constructor(
    private router: Router,
    private electronService: ElectronService,
    private passwordService: StorageService
  ) {}

  async resolve(): Promise<boolean> {
    const result = await this.electronService.ipcRenderer.invoke('appOpenType');
    if (result) {
      this.passwordService.file = result;
      this.router.navigateByUrl('/home');

      return Promise.resolve(false);
    } 

    return Promise.resolve(true);
  }
}