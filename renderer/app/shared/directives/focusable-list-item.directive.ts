import {
	Directive,
	ElementRef,
	HostBinding,
	HostListener,
	Input,
	inject,
} from '@angular/core';
import { ListStateService } from '../services/list-state.service';

@Directive({
	selector: '[appFocusableListItem]',
	standalone: true,
})
export class FocusableListItemDirective {
	@HostBinding('attr.role') public readonly role = 'listitem';
	@Input('appFocusableListItem') public item: any;

	private readonly listStateService = inject(ListStateService);
	private readonly elementRef = inject(ElementRef);

	public get elRef(): ElementRef {
		return this.elementRef;
	}

	// detect whether entry gets focused by explicit mouse click - do not focus the first list element in that case
	// used the fact that mousedown event is fired before focus event
	@HostListener('mousedown')
	public onMouseDown() {
		this.listStateService.lastFocused = this.item;
	}
}
