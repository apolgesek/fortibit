import { InjectionToken, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import 'reflect-metadata';
import '../polyfills';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { IHotkeyHandler } from './core/models';
import { MainModule } from './main/main.module';
import { SharedModule } from './shared/shared.module';
import { WindowsHotkeyHandler } from './core/services/hotkey/windows-hotkey-handler';
import { ElectronService } from './core/services/electron/electron.service';
import { StorageService } from './core/services/storage.service';
import { ModalService } from './core/services/modal.service';
import { ClipboardService } from './core/services/clipboard.service';

export const HotkeyHandler = new InjectionToken<IHotkeyHandler>('hotkeyHandler');

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
      provide: HotkeyHandler,
      useFactory: (
        electronService: ElectronService,
        storageService: StorageService,
        modalService: ModalService,
        clipboardService: ClipboardService
      ) => {
        switch (electronService.os.platform()) {
          case 'win32':
            return new WindowsHotkeyHandler(storageService, modalService, clipboardService);
          default:
            throw new Error('HotkeyHandler: Unsupported platform');
        }
      },
      deps: [
        ElectronService,
        StorageService,
        ModalService,
        ClipboardService
      ]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
