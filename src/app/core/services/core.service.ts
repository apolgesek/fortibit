import { Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { AppConfig } from "environments/environment";
import { MessageService } from "primeng-lts/api";
import { fromEvent, Subject } from "rxjs";
import { takeUntil, tap } from "rxjs/operators";
import { PasswordEntry } from "../models";
import { ElectronService } from "./electron/electron.service";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  public isInvalidPassword = false;
  public version: string;
  public shouldExit: boolean;

  private readonly preventEntryUnselectSelectors = [
    '.row-entry',
    '.menu-panel *',
    '.ui-dialog',
    '.ui-dialog-mask',
    '.entry-contextmenu',
    '.ui-toast',
    '.details-container'
  ];

  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private zone: NgZone,
    private electronService: ElectronService,
    private storageService: StorageService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.electronService.ipcRenderer.on('onContentDecrypt', (_, { decrypted, file }) => {
      this.zone.run(() => {
        try {
          this.storageService.setGroups(JSON.parse(decrypted));
          this.storageService.file = file;
          this.storageService.selectedCategory = this.storageService.groups[0];
          this.storageService.setDateSaved();
          this.router.navigate(['/dashboard']);
        } catch (err) {
          this.isInvalidPassword = true;
        }
      });
    });

    this.electronService.ipcRenderer.on('providePassword', (_, file) => {
      this.zone.run(() => {
        this.storageService.file = file;
        this.router.navigateByUrl('/home');
      });
    });

    this.electronService.ipcRenderer
    .invoke('appVersion')
    .then(result => {
      this.zone.run(() => {
        this.version = result;
      });
    });

    fromEvent(document, 'dragover')
    .pipe(tap((event) => {
      event.preventDefault();
    })).subscribe();

    // handle file drop on app window
    fromEvent(document, 'drop')
    .pipe(tap((event: DragEvent) => {
      if (event.dataTransfer.files.length) {
        this.electronService.ipcRenderer.send('onFileDrop', event.dataTransfer.files[0].path);
      }
      event.preventDefault();
    })).subscribe();

    // test for elements that should not trigger entries deselection
    fromEvent(document, 'click')
      .pipe(tap((event: MouseEvent) => {
        if (this.isOutsideClick(event)) {
          this.storageService.selectedPasswords = [];
        }
      })).subscribe();

    // confirm unsaved database
    const productionMode = AppConfig.environment !== 'LOCAL';
    // const productionMode = true;
    if (productionMode) {
      fromEvent(window, 'beforeunload')
        .pipe(tap((event) => {
          if (this.storageService.dateSaved) {
            return;
          }
          this.electronService.ipcRenderer.send('onCloseAttempt');
          event.returnValue = false;
        }),
        takeUntil(this.destroyed$))
        .subscribe();
    }
  }

  exitApp() {
    this.destroyed$.next();
    this.destroyed$.complete();

    this.electronService.ipcRenderer.send('exit');
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    if (!property) {
      return;
    }

    entry.lastAccessDate = new Date();
    this.electronService.ipcRenderer.send('copyToClipboard', property);
    this.messageService.clear();
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to clipboard!',
      life: 15000,
      data: 'clipboard',
      closable: false,
    });
  }

  private isOutsideClick(event: MouseEvent) {
    return this.preventEntryUnselectSelectors.every(s => this.isElementOutside(event, s))
    && !(<Element>event.target).classList.contains('ui-clickable')
  }

  private isElementOutside(event: MouseEvent, selector: string) {
    return !(<Element>event.target).closest(selector);
  }
}