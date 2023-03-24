import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AppComponent } from '@app/app.component';
import { DbManager } from '@app/core/database';
import { ICommunicationService } from '@app/core/models';
import { ClipboardService, ConfigService, ElectronService, EntryManager, GroupManager, ModalService, WindowsHotkeyHandler, WorkspaceService } from '@app/core/services';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { FeatherModule } from 'angular-feather';
import { AlertCircle, Book, Bookmark, CheckCircle, ChevronDown, ChevronRight, ChevronUp, Code, Copy, Edit, ExternalLink, FilePlus, Folder, Globe, Grid, Info, Key, Plus, PlusCircle, RefreshCcw, Save, Settings, Star, Trash, User, XCircle } from 'angular-feather/icons';
import { CommunicationService, HotkeyHandler } from 'injection-tokens';
import 'zone.js';
import { WebService } from './app/core/services/electron/web.service';
import { DarwinHotkeyHandler } from './app/core/services/hotkey/darwin-hotkey-handler';
import { routes } from './app/routes';
import { AppConfig } from './environments/environment';

function initializeApp(
  db: DbManager,
  communicationService: ICommunicationService,
  configService: ConfigService,
): () => Promise<void> {
  return async () => {  
    await (window as any).api.loadChannels();
    await communicationService.getPlatform();

    const config = await communicationService.ipcRenderer.invoke(IpcChannel.GetAppConfig);
    configService.setConfig(config);
  
    await db.delete();
    await db.create();
  }
}

if (AppConfig.production) {
  enableProdMode();
}

const isElectron = () => {
  return true;
};

const icons = { Edit, Trash, Save, PlusCircle, Grid, Star, Bookmark, Globe, Folder, Key, Info, User, Code, Plus, Settings, FilePlus, CheckCircle, RefreshCcw, ChevronRight, ChevronDown, ChevronUp, XCircle, AlertCircle, Copy, ExternalLink, Book };

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      RouterModule.forRoot(routes, { useHash: true }),
      FeatherModule.pick(icons)
    ),
    FileNamePipe,
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
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [
        DbManager,
        CommunicationService,
        ConfigService,
      ],
      multi: true
    },
    {
      provide: HotkeyHandler,
      useFactory: (
        communicationService: ICommunicationService,
        workspaceService: WorkspaceService,
        entriesManager: EntryManager,
        groupsManager: GroupManager,
        modalService: ModalService,
        clipboardService: ClipboardService
      ) => {
        switch (communicationService.platform) {
          case 'win32':
          case 'web':
            return new WindowsHotkeyHandler(modalService, clipboardService, workspaceService, entriesManager, groupsManager);
          case 'darwin':
            return new DarwinHotkeyHandler(modalService, clipboardService, workspaceService, entriesManager, groupsManager);
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
