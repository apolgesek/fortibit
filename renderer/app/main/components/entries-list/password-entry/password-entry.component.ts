import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { ClipboardService } from '@app/core/services';
import { EntryIconDirective } from '@app/main/directives/entry-icon.directive';
import { TextEmphasizeDirective } from '@app/main/directives/text-emphasize.directive';
import { PasswordEntry } from '@shared-renderer/password-entry.model';
import { FeatherModule } from 'angular-feather';

@Component({
	selector: 'app-password-entry',
	standalone: true,
	templateUrl: './password-entry.component.html',
	styleUrls: ['./password-entry.component.scss'],
	imports: [TextEmphasizeDirective, EntryIconDirective, FeatherModule],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasswordEntryComponent {
	@Input() iconsEnabled = false;
	@Input() item: PasswordEntry;
	@Input() searchPhrase = '';

	private readonly clipboardService = inject(ClipboardService);

	copyToClipboard(entry: PasswordEntry, property: keyof PasswordEntry) {
		this.clipboardService.copyEntryDetails(entry, property);
	}
}
