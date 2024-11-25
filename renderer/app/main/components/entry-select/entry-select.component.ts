import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit, inject } from '@angular/core';
import { SecondaryMenuBarComponent } from '@app/main/components/secondary-menu-bar/secondary-menu-bar.component';
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
		FocusableListDirective,
		FocusableListItemDirective,
		SecondaryMenuBarComponent,
	],
})
export class EntrySelectComponent implements OnInit {
	public selectedEntries: PasswordEntry[] = [];
	public passwordList: PasswordEntry[] = [];

	private readonly messageBroker = inject(MessageBroker);
	private readonly zone = inject(NgZone);

	ngOnInit(): void {
		this.messageBroker.ipcRenderer.on(
			IpcChannel.SendMatchingEntries,
			(_, entries: PasswordEntry[]) => {
				this.zone.run(() => {
					this.passwordList = entries;
					this.selectEntry(null, this.passwordList[0]);
				});
			},
		);
	}

	selectEntry(_: Event, entry: PasswordEntry) {
		this.selectedEntries = [entry];
	}

	confirmEntry() {
		this.messageBroker.ipcRenderer.send(
			IpcChannel.AutotypeEntrySelected,
			this.selectedEntries[0],
		);

		this.passwordList = [];
		this.selectedEntries = [];
	}

	isEntrySelected(entry: PasswordEntry): boolean {
		return Boolean(this.selectedEntries.find((e) => e.id === entry?.id));
	}

	trackingTag(_: number, entry: PasswordEntry): string {
		return entry.id.toString();
	}
}
