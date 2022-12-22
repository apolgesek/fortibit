import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AppComponent } from '@app/app.component';
import { DbManager } from '@app/core/database';
import { ICommunicationService } from '@app/core/models';
import { ClipboardService, ElectronService, EntryManager, GroupManager, ModalService, WindowsHotkeyHandler, WorkspaceService } from '@app/core/services';
import { CommunicationService, HotkeyHandler } from 'injection-tokens';
import { WebService } from './app/core/services/electron/web.service';
import { DarwinHotkeyHandler } from './app/core/services/hotkey/darwin-hotkey-handler';
import { routes } from './app/routes';
import { AppConfig } from './environments/environment';

function initializeApp(db: DbManager): () => Promise<void> {
  return async () => {
    await db.delete();
    await db.create();
  }
}

if (AppConfig.production) {
  enableProdMode();
}

const isElectron = () => {
  return window && window.process && window.process.type;
};

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      RouterModule.forRoot(routes, { useHash: true }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DbManager],
      multi: true
    },
    {
      provide: CommunicationService,
      useFactory: () => {
        if (isElectron()) {
          return new ElectronService();
        } else {
          return new WebService();
        }
      }
    },
    {
      provide: HotkeyHandler,
      useFactory: (
        communicationService: ICommunicationService,
        appController: WorkspaceService,
        entriesManager: EntryManager,
        groupsManager: GroupManager,
        modalService: ModalService,
        clipboardService: ClipboardService
      ) => {
        switch (communicationService.getPlatform()) {
          case 'win32':
          case 'web':
            return new WindowsHotkeyHandler(modalService, clipboardService, appController, entriesManager, groupsManager);
          case 'darwin':
            return new DarwinHotkeyHandler(modalService, clipboardService, appController, entriesManager, groupsManager);
          default:
            throw new Error('HotkeyHandler: Unsupported platform');
        }
      },
      deps: [
        CommunicationService,
        WorkspaceService,
        EntryManager,
        GroupManager,
        ModalService,
        ClipboardService
      ]
    },
  ]
}).catch(err => console.error(err));
