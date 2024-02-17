import {
	Directive,
	ElementRef,
	forwardRef,
	HostListener,
	Input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
	selector: '[appDateMask]',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => DateMaskDirective),
			multi: true,
		},
	],
	standalone: true,
})
export class DateMaskDirective implements ControlValueAccessor {
	@Input() disabled = false;

	private readonly separator = '/';
	private readonly dateRegex = /[0-9]{2}\/[0-9]{2}\/[0-9]{4}/;
	private readonly mask = `dd${this.separator}mm${this.separator}yyyy`;
	private readonly allowedKeys = [
		'ArrowLeft',
		'ArrowRight',
		'Backspace',
		'Home',
		'End',
		'Tab',
	];
	constructor(private readonly el: ElementRef) {}

	private get separatorIndexes(): number[] {
		return this.getAllIndexes(this.mask, this.separator);
	}

	@HostListener('paste', ['$event'])
	public onPaste(event: ClipboardEvent) {
		const target = event.target as HTMLInputElement;

		const filtered = event.clipboardData
			.getData('text')
			.split('')
			.filter((x) => /^[0-9]$/.test(x));

		let remaining = 0;
		for (let index = 0; index < this.mask.length; index++) {
			if (index === 2 || index === 5) {
				target.value = this.replaceAt(target.value, index, this.separator);

				continue;
			}

			target.value = this.replaceAt(target.value, index, filtered[remaining]);
			remaining += 1;
		}

		event.preventDefault();
	}

	@HostListener('keydown', ['$event'])
	public onKeyDown(event: KeyboardEvent) {
		if ((event.key === 'c' || event.key === 'v') && event.ctrlKey) {
			return;
		}

		const target = event.target as HTMLInputElement;
		const idx = target.selectionStart;

		if (
			(!event.key.match(/\d/) && !this.allowedKeys.includes(event.key)) ||
			(idx === this.mask.length && !this.allowedKeys.includes(event.key))
		) {
			event.preventDefault();
			return;
		}

		if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(event.key)) {
			return;
		}

		event.preventDefault();

		if (event.key === 'Backspace') {
			if (target.selectionStart === 0) {
				return;
			}

			target.value = this.replaceAt(target.value, idx - 1, this.mask[idx - 1]);
			target.setSelectionRange(idx - 1, idx - 1, 'backward');
		} else {
			if (this.separatorIndexes.includes(idx)) {
				target.setSelectionRange(idx + 1, idx + 1, 'forward');
				target.value = this.replaceAt(target.value, idx + 1, event.key);
				requestAnimationFrame(() => {
					target.setSelectionRange(idx + 2, idx + 2, 'forward');
				});
			} else if (this.separatorIndexes.map((x) => x - 1).includes(idx)) {
				target.value = this.replaceAt(target.value, idx, event.key);
				target.setSelectionRange(idx + 2, idx + 2, 'forward');
			} else {
				target.value = this.replaceAt(target.value, idx, event.key);
				target.setSelectionRange(idx + 1, idx + 1, 'forward');
			}
		}

		const dateParts = target.value.split(this.separator);
		const date = [dateParts[1], dateParts[0], dateParts[2]].join(
			this.separator,
		);
		const dateFormatted = [dateParts[0], dateParts[1], dateParts[2]].join(
			this.separator,
		);

		if (dateFormatted === this.mask) {
			this.onChange(null);
			this.onTouched();
		} else {
			this.onChange(new Date(date));

			if (this.dateRegex.test(dateFormatted)) {
				this.onTouched();
			}
		}
	}

	@HostListener('blur')
	public onBlur() {
		this.onTouched();
	}

	@HostListener('focus', ['$event'])
	public onFocus(event: FocusEvent) {
		requestAnimationFrame(() => {
			(event.target as HTMLInputElement).setSelectionRange(0, 0, 'forward');
		});
	}

	onChange = (value: Date) => {};
	onTouched = () => {};

	writeValue(value: Date): void {
		const input = this.el.nativeElement as HTMLInputElement;

		if (!value) {
			input.value = this.mask;

			return;
		}

		const day = value.getDate().toString().padStart(2, '0');
		const month = (value.getMonth() + 1).toString().padStart(2, '0');
		const year = value.getFullYear();

		input.value = `${day}${this.separator}${month}${this.separator}${year}`;
	}

	registerOnChange(fn: (value: Date) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.disabled = isDisabled;
	}

	private replaceAt(text: string, index: number, replacement: string): string {
		return (
			text.substring(0, index) +
			replacement +
			text.substring(index + replacement.length)
		);
	}

	private getAllIndexes(text: string, char: string) {
		const indexes = [];
		let i = -1;

		while ((i = text.indexOf(char, i + 1)) !== -1) {
			indexes.push(i);
		}

		return indexes;
	}
}
