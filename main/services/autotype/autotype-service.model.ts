import { Product } from '@root/product';
import { PasswordEntry } from '@shared-renderer/index';
import { createServiceDecorator } from '../../di';

export const IAutotypeService =
	createServiceDecorator<IAutotypeService>('autotypeService');

export interface IAutotypeService {
	registerAutocompleteShortcut(
		shortcut: string,
		usernameOnlyShortcut: string,
		passwordOnlyShortcut: string,
	): void;
	autotypeEntry(title: string): void;
	typeLoginDetails(entry: PasswordEntry): Promise<void>;
	changeEncryptionSettings(settings: Partial<Product>): void;
}
