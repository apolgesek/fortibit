import { Component } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConfigControlBase } from '../config-control-base';

@Component({
	selector: 'app-toggle-input',
	standalone: true,
	imports: [FormsModule],
	templateUrl: './toggle-input.component.html',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: ToggleInputComponent,
			multi: true,
		},
	],
})
export class ToggleInputComponent extends ConfigControlBase<boolean> {}
