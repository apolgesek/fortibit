import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  constructor(
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService
  ) { }

  public initCounter = false;
  private saveLifeValue: number = 0;
  private lifeInterval;

  @ViewChild('countRef') countRef: ElementRef;

  ngOnInit() {
    this.passwordStore.clearIntervalSource$
      .subscribe(() => {
        this.clearCounter();
      });
  }

  openNewEntryWindow() {
    this.electronService.ipcRenderer.send('openNewEntryWindow');
  }

  saveDatabase() {
    this.electronService.ipcRenderer.send('saveFile', this.passwordStore.passwordList);
  }

  getLife(msString: string) {
    this.saveLifeValue = parseInt(msString, 10);
    if (this.initCounter) {
      return true;
    }
    this.passwordStore.lifeLeft = this.saveLifeValue;
    this.lifeInterval = setInterval(() => {
      if (this.passwordStore.lifeLeft <= 0) {
        this.clearCounter();
      }
      this.passwordStore.lifeLeft += -1000;
    }, 1000);
    this.initCounter = true;
    return false;
  }

  private clearCounter() {
    this.initCounter = false;
    this.passwordStore.lifeLeft = this.saveLifeValue;
    clearInterval(this.lifeInterval);
  }

}
