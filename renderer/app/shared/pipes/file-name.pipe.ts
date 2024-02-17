import { Inject, Pipe, PipeTransform } from '@angular/core';
import { IMessageBroker } from '@app/core/models';
import { MessageBroker } from 'injection-tokens';

@Pipe({
	name: 'fileName',
	standalone: true,
})
export class FileNamePipe implements PipeTransform {
	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
	) {}

	transform(path: string): string {
		return path
			.split(this.messageBroker.platform === 'win32' ? '\\' : '/')
			.splice(-1)[0];
	}
}
