import { CommonModule, DOCUMENT } from '@angular/common';
import {
	AfterViewInit,
	Component,
	ElementRef,
	HostListener,
	Inject,
	OnInit,
	QueryList,
	ViewChildren,
} from '@angular/core';
import { MenuItem } from '@app/shared';
import { FocusableListItemDirective } from '@app/shared/directives/focusable-list-item.directive';
import { FocusableListDirective } from '@app/shared/directives/focusable-list.directive';

@Component({
	selector: 'app-context-menu',
	templateUrl: './context-menu.component.html',
	styleUrls: ['./context-menu.component.scss'],
	standalone: true,
	imports: [FocusableListDirective, FocusableListItemDirective, CommonModule],
})
export class ContextMenuComponent implements OnInit, AfterViewInit {
	@ViewChildren(FocusableListItemDirective)
	items: QueryList<FocusableListItemDirective>;
	public readonly model: MenuItem[] = [];
	public readonly destroy: () => void;
	public selected: MenuItem[];
	private readonly sourceEvent!: MouseEvent;

	constructor(
		@Inject(DOCUMENT) private readonly document: Document,
		private readonly element: ElementRef,
	) {}

	get nativeElement(): HTMLElement {
		return this.element.nativeElement;
	}

	@HostListener('keydown', ['$event'])
	public onEscapeDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			this.destroy();
		}
	}

	ngOnInit() {
		this.selected = [this.model[0] ?? null];

		for (const item of this.model) {
			if (item.disabled !== undefined) {
				item.disabled =
					typeof item.disabled === 'function' ? item.disabled() : item.disabled;
			}
		}
	}

	ngAfterViewInit() {
		if (!this.model?.length) {
			return;
		}

		this.positionElement(this.element.nativeElement);
		this.element.nativeElement.style.visibility = 'visible';
		this.items.first.elRef.nativeElement.focus();
	}

	isEntrySelected(entry: MenuItem): boolean {
		return Boolean(this.selected.find((e) => e.label === entry?.label));
	}

	setFocus(item: MenuItem) {
		this.selected = [item];
	}

	executeCommand(command: (event: Event) => void, event: Event) {
		this.destroy();
		command(event);

		event.stopPropagation();
	}

	private positionElement(element: HTMLElement) {
		// offset used to properly focus the closest item when menu opens
		const offsetPx = 2;
		let top: string;

		if (
			element.offsetHeight <=
			this.document.body.clientHeight - this.sourceEvent.clientY
		) {
			top = this.sourceEvent.pageY - offsetPx + 'px';
		} else {
			top = this.sourceEvent.pageY - element.offsetHeight + offsetPx + 'px';
		}

		element.style.top = top;
		element.style.left = this.sourceEvent.pageX + 'px';
	}
}
