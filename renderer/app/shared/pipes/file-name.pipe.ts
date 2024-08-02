import { Pipe, PipeTransform, inject } from '@angular/core';
import { MessageBroker } from 'injection-tokens';

@Pipe({
	name: 'fileName',
	standalone: true,
})
export class FileNamePipe implements PipeTransform {
	private readonly messageBroker = inject(MessageBroker);

	transform(path: string): string {
		return path
			.split(this.messageBroker.platform === 'win32' ? '\\' : '/')
			.splice(-1)[0];
	}
}
