import {
	AfterViewInit,
	ContentChildren,
	DestroyRef,
	Directive,
	HostBinding,
	QueryList,
} from '@angular/core';
import { MenuService } from '../services/menu.service';
import { DropdownDirective } from './dropdown.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
	selector: '[appMenu]',
	providers: [MenuService],
	standalone: true,
})
export class MenuDirective implements AfterViewInit {
	@HostBinding('attr.role') public readonly role = 'menubar';
	@ContentChildren(DropdownDirective) items: QueryList<DropdownDirective>;

	constructor(
		private readonly destroyRef: DestroyRef,
		private readonly menuService: MenuService,
	) {}

	ngAfterViewInit() {
		this.menuService.items = this.items.toArray();
		this.menuService.currentItem = this.items.first;

		const dropdownCollection = this.items.toArray();

		for (let index = 0; index < dropdownCollection.length; index++) {
			dropdownCollection[index].setIndex(index);

			// close all other dropdowns when one opens
			dropdownCollection[index].state.stateChanges$
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe((state) => {
					if (state.isOpen) {
						dropdownCollection
							.filter((x) => x.index !== index)
							.forEach((x) => x.state.close());
					}
				});
		}
	}
}
