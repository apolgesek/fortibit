import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import { ElectronService, HotkeyService } from './core/services';
import { DomHandler  } from 'primeng-lts/dom';
import { DialogsService } from './core/services/dialogs.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  public preload: boolean;
  constructor(
    public electronService: ElectronService,
    private translate: TranslateService,
    private dialogsService: DialogsService,
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

    this.dialogsService.init();
    this.hotkeyService.create();

    // fix of undefined el when container scrollable
    DomHandler.getOffset = function (el) {
      const rect = el?.getBoundingClientRect();
      return {
        top: rect?.top + document.body.scrollTop,
        left: rect?.left + document.body.scrollLeft
      };
    };
  }
}
