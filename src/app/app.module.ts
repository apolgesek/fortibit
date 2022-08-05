import { InjectionToken, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'reflect-metadata';
import '../polyfills';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { ICommunicationService, IHotkeyHandler } from './core/models';
import { ClipboardService } from './core/services/clipboard.service';
import { ElectronService } from './core/services/electron/electron.service';
import { WebService } from './core/services/electron/web.service';
import { WindowsHotkeyHandler } from './core/services/hotkey/windows-hotkey-handler';
import { ModalService } from './core/services/modal.service';
import { StorageService } from './core/services/storage.service';
import { MainModule } from './main/main.module';
import { SharedModule } from './shared/shared.module';

export const HotkeyHandler = new InjectionToken<IHotkeyHandler>('hotkeyHandler');
export const CommunicationService = new InjectionToken<ICommunicationService>('communicationService');

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    SharedModule,
    CoreModule,
    MainModule,
    AppRoutingModule,
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
        electronService: ICommunicationService,
        storageService: StorageService,
        modalService: ModalService,
        clipboardService: ClipboardService
      ) => {
        switch (electronService.os.platform()) {
          case 'win32':
          case 'web':
            return new WindowsHotkeyHandler(storageService, modalService, clipboardService);
          default:
            throw new Error('HotkeyHandler: Unsupported platform');
        }
      },
      deps: [
        CommunicationService,
        StorageService,
        ModalService,
        ClipboardService
      ]
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
