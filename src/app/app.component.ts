import { AfterViewInit, Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ContextMenu, ContextMenuSub } from 'primeng/contextmenu';
import { DomHandler } from 'primeng/dom';
import { fromEvent } from 'rxjs';
import { AppConfig } from '../environments/environment';
import { ElectronService } from './core/services';
import { DatabaseService } from './core/services/database.service';
import { DialogsService } from './core/services/dialogs.service';
import { HotkeyService } from './core/services/hotkey/hotkey.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit {

  private preventEntryUnselectSelectors = [
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
    private passwordService: DatabaseService,
    private dialogsService: DialogsService,
    private hotkeyService: HotkeyService,
  ) {
    translate.setDefaultLang('en');
    console.log('AppConfig', AppConfig);

    // primeng sub context menu fix / waiting for official one
    // issue: https://github.com/primefaces/primeng/issues/8077
    ContextMenuSub.prototype.position = function (sublist, item) {
      this.containerOffset = DomHandler.getOffset(item.parentElement);
      var viewport = DomHandler.getViewport();
      var sublistWidth = sublist.offsetParent ? sublist.offsetWidth : DomHandler.getHiddenElementOuterWidth(sublist);
      var itemOuterWidth = DomHandler.getOuterWidth(item.children[0]);
      var itemOuterHeight = DomHandler.getOuterHeight(item.children[0]);
      var sublistHeight = sublist.offsetHeight ? sublist.offsetHeight : DomHandler.getHiddenElementOuterHeight(sublist);
      if ((parseInt(this.containerOffset.top) + itemOuterHeight + sublistHeight) > (viewport.height - DomHandler.calculateScrollbarHeight())) {
        sublist.style.bottom = '0px';
        // below line added
        sublist.style.top = '';
      }
      else {
        sublist.style.top = '0px';
        // below line added
        sublist.style.bottom = '';
      }
      if ((parseInt(this.containerOffset.left) + itemOuterWidth + sublistWidth) > (viewport.width - DomHandler.calculateScrollbarWidth())) {
        sublist.style.left = -sublistWidth + 'px';
      }
      else {
        sublist.style.left = itemOuterWidth + 'px';
      }
    };

    // context menu should calculate it's position based on dynamic model
    ContextMenu.prototype.position = (function() {
      var cached_function = ContextMenu.prototype.position;
  
      return function() {  
        var args = arguments;
        requestAnimationFrame(() => {
          cached_function.apply(this, args);
        });
      };
    })();

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
        this.dialogsService.openConfirmExitWindow();
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
    return this.preventEntryUnselectSelectors.every(s => this.isElementOutside(s))
    && !(<Element>event.srcElement).classList.contains('ui-clickable')
  }

  private isElementOutside(selector: string) {
    return !(<Element>event.srcElement).closest(selector);
  }
}
