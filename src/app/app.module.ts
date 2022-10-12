import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'reflect-metadata';
import '../polyfills';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ICommunicationService } from './core/models';
import { EntryManager, GroupManager, WorkspaceService } from './core/services';
import { ClipboardService } from './core/services/clipboard.service';
import { ElectronService } from './core/services/electron/electron.service';
import { WebService } from './core/services/electron/web.service';
import { DarwinHotkeyHandler } from './core/services/hotkey/darwin-hotkey-handler';
import { WindowsHotkeyHandler } from './core/services/hotkey/windows-hotkey-handler';
import { ModalService } from './core/services/modal.service';
import { CommunicationService, HotkeyHandler } from '../injection-tokens';
import { MenuBarComponent } from './main/components/menu-bar/menu-bar.component';

const isElectron = () => {
  return window && window.process && window.process.type;
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MenuBarComponent
  ],
  providers: [
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
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
