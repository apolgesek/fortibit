import { Injectable } from '@angular/core';
import { EntryForm } from '@app/main/components/dialogs/entry-dialog/entry-dialog.component';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { CompareResult, IEntryTypeComparer } from './entry-type-comparer';
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
	compare(
		entry: PasswordEntry,
		form: EntryForm['value'],
		payload: EntryDialogDataPayload,
	): CompareResult {
		const changes: (keyof PasswordEntry)[] = [];

		if (entry.title !== form.title) {
			changes.push('title');
		}

		if (entry.username !== form.password.username) {
			changes.push('username');
		}

		if (payload.decryptedPassword !== form.password.passwords.password) {
			changes.push('password');
		}

		if (entry.url !== form.password.url) {
			changes.push('url');
		}

		if (entry.notes !== form.password.notes) {
			changes.push('notes');
		}

		if (entry.autotypeExp !== form.password.autotypeExp) {
			changes.push('autotypeExp');
		}

		return {
			changes,
			isEqual: changes.length === 0
		};
	}
}
