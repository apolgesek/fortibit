import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ElectronService } from '@app/core/services';
import { StorageService } from '@app/core/services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthRequiredResolver implements CanActivate {
  constructor(
    private router: Router,
    private electronService: ElectronService,
    private storageService: StorageService
  ) {}

  canActivate(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const result = await this.electronService.ipcRenderer.invoke('appOpenType');
      if (result) {
        this.storageService.file = result;
        await this.router.navigate(['/home']);
        return resolve(false);
      } 
  
      return resolve(true);
    }); 
  }
}