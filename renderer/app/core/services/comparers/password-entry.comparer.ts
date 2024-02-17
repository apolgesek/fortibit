import { Injectable } from '@angular/core';
import { EntryForm } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { IEntryTypeComparer } from './entry-type-comparer';
import { EntryDialogDataPayload } from '@app/shared';

@Injectable({
	providedIn: 'root',
})
export class PasswordEntryTypeComparer
	implements
		IEntryTypeComparer<
			PasswordEntry,
			EntryForm['value'],
			EntryDialogDataPayload
		>
{
	compare(entry: PasswordEntry, form: EntryForm['value'], payload: EntryDialogDataPayload): boolean {
		return entry.title === form.title
			&& entry.username === form.password.username
			&& payload.decryptedPassword === form.password.passwords.password
			&& entry.url === form.password.url
			&& entry.notes === form.password.notes
			&& entry.autotypeExp === form.password.autotypeExp;
	}
}
