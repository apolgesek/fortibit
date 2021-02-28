import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AppConfig } from 'environments/environment';
import { MessageService, TreeNode } from 'primeng-lts/api';
import { fromEvent } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventType } from '../enums';
import { IPasswordEntry } from '../models';
import { ElectronService } from './electron/electron.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  public isInvalidPassword = false;
  public version: string;

  constructor(
    private zone: NgZone,
    private electronService: ElectronService,
    private storageService: StorageService,
    private messageService: MessageService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.electronService.ipcRenderer.on('onContentDecrypt', (_, { decrypted, file }) => {
      this.zone.run(() => {
        if (decrypted) {
          this.storageService.setGroups(decrypted);
          this.storageService.file = file;
          this.storageService.selectedCategory = this.storageService.groups[0];
          this.storageService.setDateSaved();
          this.router.navigate(['/dashboard']);
        } else {
          this.isInvalidPassword = true;
          this.animate('.brand-logo', 'animate-invalid', 500);
        }
      });
    });

    this.electronService.ipcRenderer.on('providePassword', (_, file) => {
      this.zone.run(() => {
        this.storageService.file = file;
        this.router.navigateByUrl('/home');
      });
    });

    this.electronService.ipcRenderer.on('getSelectedEntry', (_, title: string) => {
      this.zone.run(() => {
        const entries = this.getAllEntries(this.storageService.groups[0]);
        this.electronService.ipcRenderer.send(
          'receiveSelectedEntry',
          entries.find(e => title.toLowerCase().includes(e.title.toLowerCase()))
        );
      });
    });

    this.electronService.ipcRenderer.on('saveStatus', (_, { status, message, file }) => {
      this.zone.run(() => {
        if (status) {
          this.storageService.file = file;
          this.messageService.add({
            severity: 'success',
            summary: 'Database saved',
            life: 5000,
            closable: false
          });
        } else if (message) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error: ' + message,
            life: 5000,
          });
        }
      });
    });

    this.electronService.ipcRenderer
      .invoke('appVersion')
      .then(result => {
        this.zone.run(() => {
          this.version = result;
        });
      });

    fromEvent(this.document, 'dragover')
      .pipe(tap((event) => {
        event.preventDefault();
      })).subscribe();

    // handle file drop on app window
    fromEvent(this.document, 'drop')
      .pipe(tap((event: DragEvent) => {
        if (event.dataTransfer.files.length) {
          this.checkFileSaved(EventType.DropFile, event.dataTransfer.files[0].path);
        }
        event.preventDefault();
      })).subscribe();

    // test for elements that should not trigger entries deselection
    fromEvent(this.document, 'click')
      .pipe(tap((event: MouseEvent) => {
        if (this.isOutsideClick(event)) {
          this.storageService.selectedPasswords = [];
        }
      })).subscribe();
  }

  exitApp() {
    window.onbeforeunload = undefined;
    this.electronService.ipcRenderer.send('exit');
  }

  async copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry, value: string) {
    if (!value) {
      return;
    }

    if (property === 'password') {
      const decryptedPassword = await this.electronService.ipcRenderer.invoke('decryptPassword', value);
      value = decryptedPassword;
    }

    entry.lastAccessDate = new Date();
    this.electronService.ipcRenderer.send('copyToClipboard', value);
    this.messageService.clear();
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to clipboard!',
      life: 15000,
      data: 'clipboard',
      closable: false,
    });
  }

  checkFileSaved(event?: EventType, payload?: unknown): void {
    if (this.storageService.dateSaved) {
      this.execute(event, payload);
      return;
    }
    this.electronService.ipcRenderer.send('onCloseAttempt', event, payload);
  }

  execute(event: EventType, payload?: unknown) {
    if (event === EventType.Exit) {
      this.exitApp();
    } else if (event === EventType.OpenFile) {
      this.electronService.ipcRenderer.send('openFile');
    } else if (event == EventType.DropFile) {
      this.electronService.ipcRenderer.send(
        'onFileDrop',
        payload
      );
    }
  }

  openRepositoryLink(path: string) {
    this.electronService.ipcRenderer.send('openUrl', AppConfig.urls.repositoryUrl + path);
  }

  private animate(selector: string, animationClass: string, duration = 500) {
    this.document.querySelector(selector).classList.add(animationClass);
    setTimeout(() => {
      this.document.querySelector(selector).classList.remove(animationClass);
    }, duration);
  }

  private getAllEntries(node: TreeNode): IPasswordEntry[] {
    if (!node.children?.length) {
      return node.data;
    } else {
      const children = [];
      node.children.forEach(element => {
        children.push(...this.getAllEntries(element));
      });
      return children.concat(node.data);
    }
  }

  private isOutsideClick(event: MouseEvent) {
    return !(<Element>event.target).closest('[data-prevent-entry-deselect]');
  }
}