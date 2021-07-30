import { Component, Inject, OnInit } from '@angular/core';
import { AppConfig } from '../environments/environment';
import { CoreService, ElectronService, HotkeyService, StorageService } from './core/services';
import { DomHandler  } from 'primeng/dom';
import { DialogsService } from './core/services/dialogs.service';
import { fromEvent, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventType } from './core/enums';
import { DOCUMENT } from '@angular/common';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  get isDbLoaded(): Observable<boolean> {
    return this.storageService.loadedDatabaseSource$;
  }

  constructor(
    public electronService: ElectronService,
    private coreService: CoreService,
    private dialogsService: DialogsService,
    private hotkeyService: HotkeyService,
    private storageService: StorageService,
    @Inject(DOCUMENT) private document: Document
  ) {
    console.log('AppConfig', AppConfig);

    this.dialogsService.init();
    this.hotkeyService.create();

    // fix of undefined el when container scrollable
    DomHandler.getOffset = function (el: HTMLElement) {
      const rect = el?.getBoundingClientRect();
      return {
        top: rect?.top + document.body.scrollTop,
        left: rect?.left + document.body.scrollLeft
      };
    };
  }

  async ngOnInit() {
    if (!this.storageService.file) {
      await this.storageService.setupDatabase();
      this.storageService.setDatabaseLoaded();
    }
  
    fromEvent(this.document, 'dragover')
      .pipe(tap((event: Event) => {
        (event as MouseEvent).preventDefault();
      })).subscribe();
  
    // handle file drop on app window
    fromEvent(this.document, 'drop')
      .pipe(tap((event: Event) => {
        const dataTransfer = (event as DragEvent).dataTransfer as DataTransfer;
        if (dataTransfer.files.length) {
          this.coreService.checkFileSaved(EventType.DropFile, dataTransfer.files[0].path);
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
  }

  private isOutsideClick(event: MouseEvent) {
    return !(<Element>event.target).closest('[data-prevent-entry-deselect]');
  }
}
