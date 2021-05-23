import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { IpcChannel } from '@shared-models/index';
import { AppConfig } from 'environments/environment';
import { EventType } from '../enums';
import { IPasswordEntry } from '../models';
import { EntryRepository } from '../repositories';
import { ElectronService } from './electron/electron.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  public isInvalidPassword = false;
  public config = null;

  constructor(
    private zone: NgZone,
    private electronService: ElectronService,
    private storageService: StorageService,
    private entryRepository: EntryRepository,
    private toastService: ToastService,
    private router: Router,
  ) {
    const productionMode = AppConfig.environment !== 'LOCAL';
    // const productionMode = true;
    if (productionMode) {
      window.onbeforeunload = (event: Event) => {
        this.checkFileSaved(EventType.Exit);
        event.returnValue = false;
      };
    }

    this.electronService.ipcRenderer.on(IpcChannel.ProvidePassword, (_, file) => {
      this.zone.run(() => {
        this.storageService.file = file;
        this.router.navigateByUrl('/home');
      });
    });

    this.electronService.ipcRenderer.on(IpcChannel.GetAutotypeFoundEntry, (_, title: string) => {
      this.zone.run(async () => {
        const entries = await this.entryRepository.getAll();
        const entry = entries.find(e => this.isEntryMatching(e, title));

        this.electronService.ipcRenderer.send(IpcChannel.AutocompleteEntry, entry);
      });
    });

    this.electronService.ipcRenderer.on(IpcChannel.GetSaveStatus, (_, { status, message, file }) => {
      this.zone.run(() => {
        if (status) {
          this.storageService.setDateSaved();
          this.storageService.file = file;

          this.toastService.add({
            message: 'Database saved',
            alive: 5000,
            type: 'success'
          });
        } else if (message) {
          this.toastService.add({
            type: 'error',
            message: 'Error occured',
            alive: 5000,
          });
        }
      });
    });

    this.electronService.ipcRenderer
      .invoke(IpcChannel.GetAppConfig)
      .then(result => {
        this.zone.run(() => {
          this.config = result;
        });
      });
  }

  exitApp() {
    window.onbeforeunload = null;

    setTimeout(() => {
      this.electronService.ipcRenderer.send(IpcChannel.Exit);
    });
  }

  async copyToClipboard(entry: IPasswordEntry, property: keyof IPasswordEntry, value: string) {
    if (!value) {
      return;
    }

    if (property === 'password') {
      const decryptedPassword = await this.electronService.ipcRenderer.invoke(IpcChannel.DecryptPassword, value);
      value = decryptedPassword;
    }

    entry.lastAccessDate = new Date();

    const copied = await this.electronService.ipcRenderer.invoke(IpcChannel.CopyCliboard, value);

    if (copied) {
      this.toastService.add({
        message: property.substr(0, 1).toUpperCase()
          + property.substr(1)
          + ' copied',
        alive: 15000,
        type: 'success'
      });
    }
  }

  checkFileSaved(event?: EventType, payload?: unknown): void {
    if (this.storageService.dateSaved) {
      this.execute(event, payload);
      return;
    }

    this.electronService.ipcRenderer.send(IpcChannel.TryClose, event, payload);
  }

  execute(event: EventType | undefined, payload?: unknown) {
    switch (event) {
    case EventType.Exit:
      this.exitApp();
      break;
    case EventType.OpenFile:
      this.electronService.ipcRenderer.send(IpcChannel.OpenFile);
      break;
    case EventType.DropFile:
      this.electronService.ipcRenderer.send(IpcChannel.DropFile, payload);
      break;
    default:
      break;
    }
  }

  openRepositoryLink(path: string) {
    this.electronService.ipcRenderer.send(IpcChannel.OpenUrl, AppConfig.urls.repositoryUrl + path);
  }

  private isEntryMatching(entry: IPasswordEntry, title: string): boolean {
    if (entry.notes?.length) {
      const autoTypeKey = 'AUTO_TYPE';
      const autoTypePatternStart = entry.notes.indexOf(autoTypeKey);

      if (autoTypePatternStart >= 0) {
        const pattern = entry.notes
          .substr(autoTypePatternStart + autoTypeKey.length + 1)
          .split('/[\n\r]/')[0];

        return new RegExp(pattern).test(title.toLowerCase());
      }
    }

    return title.toLowerCase().includes((entry.title as string).toLowerCase());
  }
}