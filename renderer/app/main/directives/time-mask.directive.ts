import { Directive, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
	selector: '[appTimeMask]',
	standalone: true,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: TimeMaskDirective,
			multi: true,
		},
	],
})
export class TimeMaskDirective implements ControlValueAccessor {
	private activeSelectionType: 'hours' | 'minutes';
	private keyStrokes = 0;
	private memoizedValue: string;
	private onChange: (value: string) => void;
	private onTouched: () => void;

	constructor(private el: ElementRef) {}

	writeValue(value: string): void {
		const input = this.el.nativeElement as HTMLInputElement;
		input.value = value;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	registerOnChange(fn: any): void {
		this.onChange = fn;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	registerOnTouched(fn: any): void {
		this.onTouched = fn;
	}

	@HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent): void {
		const input = this.el.nativeElement as HTMLInputElement;

		if (event.key === 'ArrowLeft') {
			this.setSelectionComponent(input, 'hours');
			this.keyStrokes = 0;
			event.preventDefault();
			return;
		}

		if (event.key === 'ArrowRight') {
			this.setSelectionComponent(input, 'minutes');
			this.keyStrokes = 0;
			event.preventDefault();
			return;
		}

		if (!event.key.match(/[0-9]/)) {
			event.preventDefault();
			return;
		}

		if (this.activeSelectionType === 'hours') {
			if (
				this.keyStrokes === 1 &&
				((input.value.split(':')[0][1].match(/[2]/) &&
					event.key.match(/[4-9]/)) ||
					input.value.split(':')[0][1].match(/[3-9)]/))
			) {
				event.preventDefault();
			}
		}

		if (this.activeSelectionType === 'minutes') {
			if (
				this.keyStrokes === 1 &&
				input.value.split(':')[1][1].match(/[6-9]/)
			) {
				event.preventDefault();
			}
		}
	}

	@HostListener('click')
	onClick() {
		this.keyStrokes = 0;
	}

	@HostListener('input', ['$event']) onInputChange(event: InputEvent): void {
		event.preventDefault();

		const input = this.el.nativeElement as HTMLInputElement;

		if (this.activeSelectionType === 'hours') {
			const minutesPart = input.value.split(':')[1];

			if (this.keyStrokes === 0) {
				input.value = '0' + event.data + ':' + minutesPart;
				this.memoizedValue = event.data;
				input.setSelectionRange(0, 2);
			} else if (this.keyStrokes === 1) {
				input.value = this.memoizedValue + event.data + ':' + minutesPart;
			}
		} else {
			const hoursPart = input.value.split(':')[0];

			if (this.keyStrokes === 0) {
				input.value = hoursPart + ':' + '0' + event.data;
				this.memoizedValue = event.data;
				input.setSelectionRange(3, 5);
			} else if (this.keyStrokes === 1) {
				input.value = hoursPart + ':' + this.memoizedValue + event.data;
			}
		}

		this.keyStrokes++;

		if (this.keyStrokes === 2 && this.activeSelectionType === 'hours') {
			this.setSelectionComponent(input, 'minutes');
			this.keyStrokes = 0;
		} else if (
			this.keyStrokes === 2 &&
			this.activeSelectionType === 'minutes'
		) {
			this.setSelectionComponent(input, 'hours');
			this.keyStrokes = 0;
		}

		this.onChange(input.value);
	}

	@HostListener('blur') onBlur(): void {
		this.keyStrokes = 0;
	}

	@HostListener('focus', ['$event'])
	@HostListener('selectionchange', ['$event'])
	onFocus(): void {
		const input = this.el.nativeElement as HTMLInputElement;
		this.setSelection(input);
	}

	private setSelection(input: HTMLInputElement) {
		const pos = input.selectionStart;
		if (pos >= 0 && pos <= 2) {
			this.setSelectionComponent(input, 'hours');
		} else {
			this.setSelectionComponent(input, 'minutes');
		}
	}

	private setSelectionComponent(
		input: HTMLInputElement,
		component: 'hours' | 'minutes',
	) {
		this.activeSelectionType = component;

		if (component === 'hours') {
			input.setSelectionRange(0, 2);
		} else {
			input.setSelectionRange(3, 5);
		}
	}
}
