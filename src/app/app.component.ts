import { Component, AfterViewInit, NgZone } from '@angular/core';
import { ElectronService } from './core/services';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import { Router } from '@angular/router';
import { fromEvent } from 'rxjs';
import { PasswordStoreService } from './core/services/password-store.service';
import { HotkeyService } from './core/services/hotkey.service';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  constructor(
    public electronService: ElectronService,
    private translate: TranslateService,
    private router: Router,
    private zone: NgZone,
    private passwordService: PasswordStoreService,
    private hotkeyService: HotkeyService,
    private confirmationService: ConfirmationService,
  ) {
    translate.setDefaultLang('en');
    console.log('AppConfig', AppConfig);

    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Mode electron');
      console.log('Electron ipcRenderer', electronService.ipcRenderer);
      console.log('NodeJS childProcess', electronService.childProcess);
    } else {
      console.log('Mode web');
    }

    this.electronService.ipcRenderer.on('providePassword', (_, filePath) => {
      this.zone.run(() => {
        this.passwordService.filePath = filePath;
        this.router.navigateByUrl('/home');
      });
    });

    fromEvent(window, 'keydown').subscribe((event: KeyboardEvent) => {
      this.hotkeyService.intercept(event);
    });
  }

  ngAfterViewInit(): void {
    document.ondragover = document.ondrop = (ev) => {
      ev.preventDefault();
    }

    document.body.ondrop = (ev) => {
      if (ev.dataTransfer.files.length) {
        this.electronService.ipcRenderer.send('onFileDrop', ev.dataTransfer.files[0].path);
      }
      ev.preventDefault();
    }

    // test for elements that should not trigger entries deselection
    // entry row itself, menu buttons and dialog body
    document.addEventListener("click", (event: MouseEvent) => {
      if (
        !(<Element>event.srcElement).closest('.row-entry')
        && !(<Element>event.srcElement).closest('.menu-panel *')
        && !(<Element>event.srcElement).closest('.ui-dialog')
      ) {
        this.passwordService.selectedPasswords = [];
      }
    });

    this.electronService.ipcRenderer.on('openCloseConfirmationWindow', () => {
      this.zone.run(() => {
        this.confirmationService.confirm({ message: 'Save database changes before exiting Haslock?' });
      });
    })

    if (AppConfig.environment !== 'LOCAL') {
      window.onbeforeunload = (e) => {
        this.electronService.ipcRenderer.send('onCloseAttempt');
        e.returnValue = false;
      }
    }
  }

}
