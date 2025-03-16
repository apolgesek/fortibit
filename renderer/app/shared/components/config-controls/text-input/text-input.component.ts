import { Component, Input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HotkeyBinderDirective } from '@app/main/directives/hotkey-binder.directive';
import { TimeMaskDirective } from '@app/main/directives/time-mask.directive';
import { ValidationErrorComponent } from '@app/shared/components/validation-error/validation-error.component';
import { ConfigControlBase } from '../config-control-base';

@Component({
	selector: 'app-text-input',
	standalone: true,
	imports: [
		FormsModule,
		ValidationErrorComponent,
		HotkeyBinderDirective,
		TimeMaskDirective,
	],
	templateUrl: './text-input.component.html',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: TextInputComponent,
			multi: true,
		},
	],
})
export class TextInputComponent extends ConfigControlBase<string> {
	@Input() type: 'time' | 'hotkey' | 'text' = 'text';
	@Input() errors: Record<string, string> | string;
}
