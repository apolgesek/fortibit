import { Component, Inject } from '@angular/core';
import { CommunicationService } from 'injection-tokens';
import { ICommunicationService } from '@app/core/models';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';

@Component({
  selector: 'app-secondary-menu-bar',
  templateUrl: './secondary-menu-bar.component.html',
  styleUrls: ['../menu-bar/menu-bar.component.scss'],
  standalone: true,
  imports: [
    MenuDirective,
    DropdownDirective,
    DropdownToggleDirective,
    DropdownMenuDirective,
    MenuItemDirective
  ]
})
export class SecondaryMenuBarComponent {
  private theme: 'w' | 'k' = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'w' : 'k';
  
  public get closeIcons(): string {
    return [
      `assets/icons/close-${this.theme}-10.png 1x`,
      `assets/icons/close-${this.theme}-12.png 1.25x`,
      `assets/icons/close-${this.theme}-15.png 1.5x`,
      `assets/icons/close-${this.theme}-15.png 1.75x`,
      `assets/icons/close-${this.theme}-20.png 2x`,
      `assets/icons/close-${this.theme}-20.png 2.25x`,
      `assets/icons/close-${this.theme}-24.png 2.5x`,
      `assets/icons/close-${this.theme}-30.png 3x`,
      `assets/icons/close-${this.theme}-30.png 3.5x`
    ].join(',');
  }

  constructor(@Inject(CommunicationService) private readonly communicationService: ICommunicationService) { }

  quit() {
    this.communicationService.ipcRenderer.send(IpcChannel.Close);
  }
}
