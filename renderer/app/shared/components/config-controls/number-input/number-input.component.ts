import { Component, Input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ValidationErrorComponent } from '@app/shared/components/validation-error/validation-error.component';
import { InputMaskDirective } from '@app/shared/directives/input-mask.directive';
import { ConfigControlBase } from '../config-control-base';

@Component({
	selector: 'app-number-input',
	standalone: true,
	imports: [FormsModule, InputMaskDirective, ValidationErrorComponent],
	templateUrl: './number-input.component.html',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: NumberInputComponent,
			multi: true,
		},
	],
})
export class NumberInputComponent extends ConfigControlBase<number> {
	@Input() maxLength: number;
	@Input() errors: Record<string, string> | string;
}
