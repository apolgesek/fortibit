import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
	selector: '[appInputMask]',
	standalone: true,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: InputMaskDirective,
			multi: true,
		},
	],
})
export class InputMaskDirective implements ControlValueAccessor {
	@Input({ required: true }) type: 'number' | 'text';
	@Input() maxLength: number;

	private onChange: (value: string | number) => void;
	private onTouched: () => void;

	constructor(private el: ElementRef) {}

	writeValue(value: string | number): void {
		this.el.nativeElement.value = value;
	}

	registerOnChange(fn: (value: string | number) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	@HostListener('input', ['$event']) onInput(event: InputEvent): void {
		switch (this.type) {
			case 'number':
				this.handleNumberInput(event);
				break;
			case 'text':
				this.handleTextInput();
				break;
			default:
				break;
		}
	}

	private handleNumberInput(event: InputEvent): void {
		const input = event.target as HTMLInputElement;
		const value = input.value.toString();

		if (this.maxLength >= 0 && value.length > this.maxLength) {
			input.value = value.slice(0, this.maxLength);
		}

		this.onChange(input.valueAsNumber);
	}

	private handleTextInput(): void {
		return;
	}
}
