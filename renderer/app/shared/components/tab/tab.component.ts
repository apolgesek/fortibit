import { Component, Input, inject } from '@angular/core';
import { TabService } from '@app/shared/services/tab.service';

@Component({
	selector: 'app-tab',
	templateUrl: './tab.component.html',
	standalone: true,
})
export class TabComponent {
	@Input() public readonly header: string;
	@Input() public readonly disabled: boolean;

	public active = false;

	private readonly tabService = inject(TabService);

	constructor() {
		this.tabService.addTab(this);
	}
}
