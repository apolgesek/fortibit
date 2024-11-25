import { Injectable, inject } from '@angular/core';
import { Entry, IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';

type IconEntry = Entry & { icon?: string };

@Injectable({ providedIn: 'root' })
export class IconService {
	private readonly messageBroker = inject(MessageBroker);

	getIconPath<T extends IconEntry>(entry: T, key: keyof T): void {
		if (entry[key]) {
			this.messageBroker.ipcRenderer.send(
				IpcChannel.TryGetIcon,
				entry.id,
				entry[key],
			);
		}
	}

	replaceIconPath<T extends IconEntry>(
		editedEntry: T,
		newEntry: Partial<T>,
		key: keyof T,
	): void {
		this.messageBroker.ipcRenderer.send(
			IpcChannel.TryReplaceIcon,
			editedEntry.id,
			editedEntry.icon,
			newEntry[key],
		);
	}

	removeIconPath(entry: Partial<IconEntry>): void {
		this.messageBroker.ipcRenderer.send(IpcChannel.RemoveIcon, entry);
	}
}
