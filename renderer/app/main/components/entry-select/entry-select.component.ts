import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecondaryMenuBarComponent } from '@app/main/components/secondary-menu-bar/secondary-menu-bar.component';
import { IPasswordEntry } from '@shared-renderer/password-entry.model';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { EntryIconDirective } from '@app/main/directives/entry-icon.directive';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';
import { ICommunicationService } from '@app/core/models';
import { CommunicationService } from 'injection-tokens';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { FeatherModule } from 'angular-feather';

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
  public passwordList: IPasswordEntry[];

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly zone: NgZone
  ) { }

  ngOnInit(): void {
    this.communicationService.ipcRenderer.on(IpcChannel.SendMatchingEntries, (_, entries: IPasswordEntry[]) => {
      this.zone.run(() => {
        this.passwordList = entries;
      });
    });
  }

  selectEntry(event: MouseEvent, entry: IPasswordEntry) {
    this.selectedEntries = [entry];
  }

  confirmEntry() {
    this.communicationService.ipcRenderer.send(IpcChannel.AutotypeEntrySelected, this.selectedEntries[0]);
  }

  isEntrySelected(entry: IPasswordEntry): boolean {
    return Boolean(this.selectedEntries.find(e => e.id === entry?.id));
  }

  trackingTag(_: number, entry: IPasswordEntry): string {
    return entry.id.toString();
  }
}
