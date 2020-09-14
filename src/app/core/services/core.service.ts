import { Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { MessageService } from "primeng/api";
import { PasswordEntry } from "../models";
import { ElectronService } from "./electron/electron.service";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  public isInvalidPassword = false;

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

    this.electronService.ipcRenderer.on('saveStatus', (_, { status, message, file }) => {
      this.zone.run(() => {
        if (status) {
          this.storageService.file = file;
          this.messageService.add({
            severity: 'success',
            summary: 'Database saved',
            life: 5000,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error: ' + message,
            life: 5000,
          });
        }
      });
    });

    this.electronService.ipcRenderer.on('providePassword', (_, file) => {
      this.zone.run(() => {
        this.storageService.file = file;
        this.router.navigateByUrl('/home');
      });
    });
  }

  exitApp() {
    window.onbeforeunload = undefined;
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
      detail: 'clipboard'
    });
  }
}