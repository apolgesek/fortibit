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
  public readonly closeIcon = 'assets/icons/close.png';

  constructor(@Inject(CommunicationService) private readonly communicationService: ICommunicationService) { }

  quit() {
    this.communicationService.ipcRenderer.send(IpcChannel.Close);
  }
}
