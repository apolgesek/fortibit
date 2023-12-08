import { HttpClientModule } from '@angular/common/http';
import {
  APP_INITIALIZER,
  enableProdMode,
  importProvidersFrom,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AppComponent } from '@app/app.component';
import { DbManager } from '@app/core/database';
import { IMessageBroker } from '@app/core/models';
import {
  ClipboardService,
  ConfigService,
  ElectronService,
  EntryManager,
  GroupManager,
  ModalService,
  WindowsHotkeyHandler,
  WorkspaceService,
} from '@app/core/services';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { FeatherModule } from 'angular-feather';
import {
  AlertCircle,
  Book,
  Bookmark,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code,
  Copy,
  Edit,
  Edit2,
  Link,
  Eye,
  EyeOff,
  FilePlus,
  Folder,
  Globe,
  Grid,
  Info,
  Key,
  Plus,
  Minus,
  PlusCircle,
  RefreshCw,
  RefreshCcw,
  Save,
  Settings,
  Star,
  Trash,
  User,
  XCircle,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Share,
  Heart,
} from 'angular-feather/icons';
import { MessageBroker, HotkeyHandler } from 'injection-tokens';
import 'zone.js';
import { WebService } from './app/core/services/electron/web.service';
import { DarwinHotkeyHandler } from './app/core/services/hotkey/darwin-hotkey-handler';
import { routes } from './app/routes';
import { AppConfig } from './environments/environment';
import { IpcChannel } from '@shared-renderer/index';
import isElectron from 'is-electron';

function initializeApp(
  db: DbManager,
  messageBroker: IMessageBroker,
  configService: ConfigService
): () => Promise<void> {
  return async () => {
    if (isElectron()) {
      await (window as any).api.loadChannels();
    } else {
      (window as any).api = {
        loadChannels: () => {}
      };
    }

    await messageBroker.getPlatform();
    const config = await messageBroker.ipcRenderer.invoke(IpcChannel.GetAppConfig);
    configService.setConfig(config);

    await db.delete();
    await db.create();
  };
}

if (AppConfig.production) {
  enableProdMode();
}

const icons = {
  Edit,
  Edit2,
  Trash,
  Save,
  PlusCircle,
  Grid,
  Star,
  Bookmark,
  Globe,
  Folder,
  Key,
  Info,
  User,
  Code,
  Plus,
  Minus,
  Settings,
  FilePlus,
  Check,
  CheckCircle,
  RefreshCw,
  RefreshCcw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertCircle,
  Copy,
  Link,
  Book,
  Eye,
  EyeOff,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Share,
  Heart
};

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
      provide: MessageBroker,
      useFactory: () => {
        if (isElectron()) {
          return new ElectronService();
        } else {
          return new WebService();
        }
      },
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DbManager, MessageBroker, ConfigService],
      multi: true,
    },
    {
      provide: HotkeyHandler,
      useFactory: (
        messageBroker: IMessageBroker,
        workspaceService: WorkspaceService,
        entriesManager: EntryManager,
        groupsManager: GroupManager,
        modalService: ModalService,
        clipboardService: ClipboardService
      ) => {
        switch (messageBroker.platform) {
        case 'win32':
        case 'web':
          return new WindowsHotkeyHandler(
            modalService,
            clipboardService,
            workspaceService,
            entriesManager,
            groupsManager
          );
        case 'darwin':
          return new DarwinHotkeyHandler(
            modalService,
            clipboardService,
            workspaceService,
            entriesManager,
            groupsManager
          );
        default:
          throw new Error('HotkeyHandler: Unsupported platform');
        }
      },
      deps: [
        MessageBroker,
        WorkspaceService,
        EntryManager,
        GroupManager,
        ModalService,
        ClipboardService,
      ],
    },
  ],
}).catch((err) => console.error(err));
