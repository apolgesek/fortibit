import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '@app/app.component';
import { ICommunicationService } from '@app/core/models';
import { ElectronService, WorkspaceService, EntryManager, GroupManager, ModalService, ClipboardService, WindowsHotkeyHandler } from '@app/core/services';
import { CommunicationService, HotkeyHandler } from 'injection-tokens';
import { DarwinHotkeyHandler } from './app/core/services/hotkey/darwin-hotkey-handler';
import { WebService } from './app/core/services/electron/web.service';

import { AppConfig } from './environments/environment';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { routes } from './app/routes';

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
