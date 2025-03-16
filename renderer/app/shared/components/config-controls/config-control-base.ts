import { Directive, inject, Injector, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Directive()
export abstract class ConfigControlBase<T>
	implements ControlValueAccessor, OnInit
{
	@Input({ required: true }) label: string;

	value: T;
	isDisabled = false;

	get id(): string {
		return this.ngControl.path.join('-');
	}

	private readonly injector = inject(Injector);
	ngControl: NgControl | undefined;

	ngOnInit(): void {
		this.ngControl = this.injector.get(NgControl, null, {
			self: true,
			optional: true,
		});
	}

	onChange: (value: T) => void;
	onTouched: () => void;

	writeValue(value: T): void {
		this.value = value;
	}

	registerOnChange(fn: (value: T) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.isDisabled = isDisabled;
	}

	onModelChange() {
		this.onChange(this.value);
	}
}
