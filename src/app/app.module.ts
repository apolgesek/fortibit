import { HttpClientModule } from '@angular/common/http';
import { InjectionToken, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'reflect-metadata';
import '../polyfills';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { ICommunicationService, IHotkeyHandler } from './core/models';
import { WorkspaceService, EntryManager, GroupManager } from './core/services';
import { ClipboardService } from './core/services/clipboard.service';
import { ElectronService } from './core/services/electron/electron.service';
import { WebService } from './core/services/electron/web.service';
import { WindowsHotkeyHandler } from './core/services/hotkey/windows-hotkey-handler';
import { DarwinHotkeyHandler } from './core/services/hotkey/darwin-hotkey-handler';
import { ModalService } from './core/services/modal.service';
import { MainModule } from './main/main.module';
import { SharedModule } from './shared/shared.module';
import { ScrollingModule } from '@angular/cdk/scrolling';

export const HotkeyHandler = new InjectionToken<IHotkeyHandler>('hotkeyHandler');
export const CommunicationService = new InjectionToken<ICommunicationService>('communicationService');

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    SharedModule,
    CoreModule,
    MainModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: CommunicationService,
      useFactory: () => {
        if (!!(window && window.process && window.process.type)) {
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
        switch (communicationService.os.platform()) {
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
