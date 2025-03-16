import {
	AfterViewInit,
	Component,
	inject,
	Injector,
	Input,
	OnInit,
} from '@angular/core';
import {
	AbstractControl,
	ControlValueAccessor,
	NG_VALUE_ACCESSOR,
	NgControl,
} from '@angular/forms';
import { isControlInvalid } from '@app/utils/form-util';

@Component({
	selector: 'app-validation-error',
	standalone: true,
	imports: [],
	templateUrl: './validation-error.component.html',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			multi: true,
			useExisting: ValidationErrorComponent,
		},
	],
})
export class ValidationErrorComponent
	implements ControlValueAccessor, OnInit, AfterViewInit
{
	@Input({ required: false }) control!: AbstractControl;
	@Input() errors!: Record<string, string> | string;

	public readonly isControlInvalid = isControlInvalid;
	private readonly injector = inject(Injector);
	private ngControl: NgControl | undefined;

	ngOnInit(): void {
		this.ngControl = this.injector.get(NgControl, null, {
			self: true,
			optional: true,
		});
	}

	ngAfterViewInit(): void {
		if (!this.control && !this.ngControl) {
			throw new Error('"control" or "formControlName" is required');
		}

		if (this.control && this.ngControl?.control) {
			throw new Error('Only "control" or "formControlName" must be provided');
		}
	}

	/* eslint-disable @typescript-eslint/no-empty-function */
	writeValue(): void {}
	registerOnChange(): void {}
	registerOnTouched(): void {}
	/* eslint-enable @typescript-eslint/no-empty-function */

	get controlInstance(): AbstractControl {
		return this.control ?? this.ngControl?.control;
	}

	get isValid(): boolean {
		return this.controlInstance.valid;
	}

	get dirty(): boolean {
		return this.controlInstance.dirty;
	}

	get message(): string {
		const errors = this.controlInstance.errors;

		if (errors) {
			if (typeof this.errors === 'string') {
				return this.errors;
			}

			const key = Object.keys(errors)[0];
			return this.errors[key];
		}
	}
}
