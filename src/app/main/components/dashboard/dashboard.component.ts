import { Component } from '@angular/core';
import { IPasswordEntry } from '@app/core/models';
import { StorageService } from '@app/core/services';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  get selectedEntry(): IPasswordEntry | undefined{
    return this.storageService.selectedPasswords.length === 1 ? this.storageService.selectedPasswords[0] : undefined;
  }

  constructor(private storageService: StorageService) {}
}
