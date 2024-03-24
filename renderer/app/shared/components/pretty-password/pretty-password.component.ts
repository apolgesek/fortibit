import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	inject,
} from '@angular/core';

@Component({
	selector: 'app-pretty-password',
	template: '',
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class PrettyPasswordComponent {
	private readonly element: ElementRef = inject(ElementRef);

	@Input() set value(value: string) {
		this.applyChanges(value);
	}

	applyChanges(value: string) {
		const elementTextContent = this.element.nativeElement as HTMLElement;
		elementTextContent.innerHTML = value
			.replaceAll(
				/([^a-z0-9])/gim,
				'<span class="pretty-special-char">$1</span>',
			)
			.replaceAll(/([0-9])/gim, '<span class="pretty-digit">$1</span>');
	}
}
