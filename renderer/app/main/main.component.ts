import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { HotkeyHandler, MessageBroker } from 'injection-tokens';
import { fromEvent, tap } from 'rxjs';
import { IpcChannel } from '../../../shared/ipc-channel.enum';
import { IHotkeyHandler, IMessageBroker } from '../core/models';
import { AppViewContainer } from '../core/services';
import { MenuBarComponent } from '../main/components/menu-bar/menu-bar.component';

const ONE_HOUR = 1000 * 60 * 60;

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  standalone: true,
  imports: [RouterModule, CommonModule, MenuBarComponent],
})
export class MainComponent implements OnInit {
  public isElectron = false;
  public isDatabaseLoaded: boolean;

  constructor(
		@Inject(MessageBroker) public readonly messageBroker: IMessageBroker,
    @Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler,
		private readonly appViewContainer: AppViewContainer,
		private readonly viewContainerRef: ViewContainerRef,
    private readonly destroyRef: DestroyRef
  ) {
    this.isElectron = this.messageBroker.platform !== 'web';
    this.appViewContainer.appViewContainerRef = this.viewContainerRef;
  }

  ngOnInit() {
    this.messageBroker.ipcRenderer.send(IpcChannel.CheckUpdate);

    setInterval(() => {
      this.messageBroker.ipcRenderer.send(IpcChannel.CheckUpdate);
    }, ONE_HOUR);
  }

  ngAfterViewInit(): void {
    // fromEvent(window, 'keydown')
    //   .pipe(
    //     tap((event: Event) => {
    //       this.hotkeyHandler.registerOpenSettings(event as KeyboardEvent);
    //     }),
    //     takeUntilDestroyed(this.destroyRef)
    //   ).subscribe();
  }
}
