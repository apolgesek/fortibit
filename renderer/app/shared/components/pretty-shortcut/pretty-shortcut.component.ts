import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	inject,
} from '@angular/core';

@Component({
	selector: 'app-pretty-shortcut',
	template: '',
	styles: [`
		:host {
			user-select: none;
			display: flex;
			align-items: center;
		}
	`],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class PrettyShortcutComponent {
	private readonly element: ElementRef = inject(ElementRef);

	@Input() set shortcut(value: string) {
		this.applyChanges(value);
	}

	applyChanges(value: string) {
		const elementTextContent = this.element.nativeElement as HTMLElement;
		elementTextContent.innerHTML = value.replaceAll(
			/([^\+]+(?=[^\+]*))/gim,
			'<span class="pretty-key">$1</span>',
		);
	}
}
