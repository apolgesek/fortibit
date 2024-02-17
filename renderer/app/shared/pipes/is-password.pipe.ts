import { Pipe, PipeTransform } from '@angular/core';
import { Entry, PasswordEntry } from '@shared-renderer/index';

@Pipe({
	name: 'isPassword',
	standalone: true,
})
export class IsPasswordPipe implements PipeTransform {
	transform(value?: Entry): value is PasswordEntry {
		return value?.type === 'password';
	}
}
