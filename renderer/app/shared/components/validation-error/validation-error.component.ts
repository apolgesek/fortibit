import { Component, inject, Input, OnInit } from '@angular/core';
import { AbstractControl, ControlContainer } from '@angular/forms';
import { isControlInvalid } from '@app/utils/form-util';

@Component({
	selector: 'app-validation-error',
	standalone: true,
	imports: [],
	templateUrl: './validation-error.component.html',
})
export class ValidationErrorComponent implements OnInit {
	@Input() controlName!: string;
	@Input() control!: AbstractControl;
	@Input() errors!: Record<string, string> | string;

	public readonly isControlInvalid = isControlInvalid;
	private readonly controlContainer = inject(ControlContainer);

	ngOnInit(): void {
		if (!this.control && !this.controlName) {
			throw new Error('"control" or "controlName" is required');
		}

		if (this.control && this.controlName) {
			throw new Error('Only "control" or "controlName" must be provided');
		}
	}

	get controlInstance(): AbstractControl {
		return this.control ?? this.controlContainer.control?.get(this.controlName);
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
