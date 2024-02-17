import { Injectable, inject } from '@angular/core';
import { EntryForm } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { MessageBroker } from 'injection-tokens';
import { IEntryTypeMapper } from './entry-type-mapper';

@Injectable({
	providedIn: 'root',
})
export class PasswordEntryMapper
	implements IEntryTypeMapper<EntryForm['value'], PasswordEntry>
{
	private readonly messageBroker = inject(MessageBroker);

	async map(form: EntryForm['value']): Promise<Partial<PasswordEntry>> {
		const currentTime = new Date().getTime();
		const encryptedPassword = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.EncryptPassword,
			form.password.passwords.password,
		);

		const entry: Partial<PasswordEntry> = {
			title: form.title,
			username: form.password.username,
			password: encryptedPassword,
			url: form.password.url,
			notes: form.password.notes,
			autotypeExp: form.password.autotypeExp,
			groupId: form.groupId,
			lastModificationDate: currentTime,
		};

		if (form.id) {
			entry.id = form.id;
		} else {
			entry.type = 'password';
			entry.creationDate = currentTime;
		}

		return entry;
	}
}
