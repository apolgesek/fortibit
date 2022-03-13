import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppConfig } from '../environments/environment';
import { EventType } from './core/enums';
import { FontFaceSet } from 'css-font-loading-module';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  get isDatabaseLoaded(): Observable<boolean> {
    return this.storageService.loadedDatabaseSource$;
  }

  @HostListener('document:dragenter', ['$event'])
  private onDragEnter(event: MouseEvent) {
    event.preventDefault();
  }

  constructor(
    public readonly electronService: ElectronService,
    private readonly storageService: StorageService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    console.log('AppConfig', AppConfig);
  }

  async ngOnInit() {
    // preload fonts
    (document.fonts as FontFaceSet).forEach(x => x.status === 'unloaded' && x.load());

    await this.storageService.setupDatabase();
    this.registerGlobalEvents();
  }

  private registerGlobalEvents() {
    fromEvent(this.document, 'dragover')
      .pipe(tap((event: Event) => {
        (event as MouseEvent).preventDefault();
      })).subscribe();

    // handle file drop on app window
    fromEvent(this.document, 'drop')
      .pipe(tap((event: Event) => {
        const dataTransfer = (event as DragEvent).dataTransfer as DataTransfer;
        if (dataTransfer.files.length) {
          this.storageService.checkFileSaved(EventType.DropFile, dataTransfer.files[0].path);
        }
        event.preventDefault();
      })).subscribe();

    // test for elements that should not trigger entries deselection
    fromEvent(this.document, 'click')
      .pipe(tap((event: Event) => {
        if (this.isOutsideClick(event as MouseEvent)) {
          this.storageService.selectedPasswords = [];
        }
      })).subscribe();

    const productionMode = AppConfig.environment !== 'LOCAL';

    if (productionMode) {
      window.onbeforeunload = (event: Event) => {
        this.storageService.checkFileSaved(EventType.Exit);
        event.returnValue = false;
      };
    }
  }

  private isOutsideClick(event: MouseEvent) {
    return !(<Element>event.target).closest('[data-prevent-entry-deselect]');
  }
}
