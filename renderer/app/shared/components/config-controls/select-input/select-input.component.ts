import { Component, Input } from '@angular/core';
import { ConfigControlBase } from '../config-control-base';
import { DropdownDirective } from '../../../directives/dropdown.directive';
import { DropdownToggleDirective } from '../../../directives/dropdown-toggle.directive';
import { FeatherModule } from 'angular-feather';
import { KeyValuePipe, NgClass } from '@angular/common';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';

@Component({
	selector: 'app-select-input',
	standalone: true,
	imports: [
		FeatherModule,
		DropdownDirective,
		DropdownToggleDirective,
		DropdownMenuDirective,
		MenuItemDirective,
		FeatherModule,
		NgClass,
		KeyValuePipe,
	],
	templateUrl: './select-input.component.html',
	styleUrl: './select-input.component.scss',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: SelectInputComponent,
			multi: true,
		},
	],
})
export class SelectInputComponent extends ConfigControlBase<string> {
	@Input() options: Record<string, any>;
}
