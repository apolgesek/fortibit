import { AfterViewInit, Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import { AppConfig } from '../environments/environment';
import { ElectronService } from './core/services';
import { HotkeyService } from './core/services/hotkey/hotkey.service';
import { PasswordStoreService } from './core/services/password-store.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit {

  private cssSelectors = [
    '.row-entry',
    '.menu-panel *',
    '.ui-dialog',
    '.entry-contextmenu',
    '.ui-toast',
    '.details-container'
  ];

  constructor(
    public electronService: ElectronService,
    private translate: TranslateService,
    private router: Router,
    private zone: NgZone,
    private passwordService: PasswordStoreService,
    private hotkeyService: HotkeyService,
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

    this.electronService.ipcRenderer.on('providePassword', (_, file) => {
      this.zone.run(() => {
        this.passwordService.file = file;
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

    // handle file drop on app window
    document.body.ondrop = (ev) => {
      if (ev.dataTransfer.files.length) {
        this.electronService.ipcRenderer.send('onFileDrop', ev.dataTransfer.files[0].path);
      }
      ev.preventDefault();
    }

    // test for elements that should not trigger entries deselection
    document.addEventListener("click", (event: MouseEvent) => {
      if (this.isOutsideClick(event)) {
        this.passwordService.selectedPasswords = [];
      }
    });

    this.electronService.ipcRenderer.on('openCloseConfirmationWindow', () => {
      this.zone.run(() => {
        this.passwordService.isConfirmExitDialogShown = true;
      });
    })

    // confirm unsaved database
    if (AppConfig.environment !== 'LOCAL') {
      window.onbeforeunload = (event) => {
        if (this.passwordService.dateSaved) {
          return;
        }
        this.electronService.ipcRenderer.send('onCloseAttempt');
        event.returnValue = false;
      }
    }
  }

  private isOutsideClick(event: MouseEvent) {
    return this.cssSelectors.every(s => this.isElementOutside(s))
    && !(<Element>event.srcElement).classList.contains('ui-clickable')
  }

  private isElementOutside(selector: string) {
    return !(<Element>event.srcElement).closest(selector);
  }
}
