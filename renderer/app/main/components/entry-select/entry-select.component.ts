import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { SecondaryMenuBarComponent } from '@app/main/components/secondary-menu-bar/secondary-menu-bar.component';
import { EntryIconDirective } from '@app/main/directives/entry-icon.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';

@Component({
  selector: 'app-entry-select',
  templateUrl: './entry-select.component.html',
  styleUrls: ['./entry-select.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    FeatherModule,
    EntryIconDirective,
    FocusableListDirective,
    FocusableListItemDirective,
    SecondaryMenuBarComponent,
  ]
})
export class EntrySelectComponent implements OnInit {
  public selectedEntries = [];
  public passwordList: PasswordEntry[];

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
    private readonly zone: NgZone,
  ) { }

  ngOnInit(): void {
    this.messageBroker.ipcRenderer.on(IpcChannel.SendMatchingEntries, (_, entries: PasswordEntry[]) => {
      this.zone.run(() => {
        this.passwordList = entries;
        this.selectEntry(null, this.passwordList[0]);
      });
    });
  }

  selectEntry(_: MouseEvent, entry: PasswordEntry) {
    this.selectedEntries = [entry];
  }

  confirmEntry() {
    this.messageBroker.ipcRenderer.send(IpcChannel.AutotypeEntrySelected, this.selectedEntries[0]);
  }

  isEntrySelected(entry: PasswordEntry): boolean {
    return Boolean(this.selectedEntries.find(e => e.id === entry?.id));
  }

  trackingTag(_: number, entry: PasswordEntry): string {
    return entry.id.toString();
  }
}
