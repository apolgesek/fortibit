import {
	Directive,
	ElementRef,
	EventEmitter,
	HostBinding,
	HostListener,
	Input,
	Output,
} from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

@Directive({
	selector: '[appMenuItem]',
	standalone: true,
})
export class MenuItemDirective {
	@HostBinding('attr.role') public readonly role = 'menuitem';
	@HostBinding('attr.aria-hidden') public readonly ariaHidden = 'true';
	@HostBinding('attr.tabindex') public readonly tabindex = '0';
	// eslint-disable-next-line @angular-eslint/no-input-rename
	@Input('appDropdownToggle') isDropdownToggle: string;
	@Input() closeOnSelect = true;
	@Input() closeMode: 'tree' | 'subtree' = 'tree';
	@Output() activate = new EventEmitter();
	private _isDisabled = false;

	constructor(
		private readonly dropdownState: DropdownStateService,
		private readonly el: ElementRef,
	) {}

	@HostBinding('class.disabled')
	@HostBinding('attr.aria-disabled')
	public get isDisabled(): boolean {
		return this._isDisabled;
	}

	@HostBinding('class.focused')
	public get isFocused(): boolean {
		return (
			(this.dropdownState.currentItem === this ||
				(this.dropdownState.parent &&
					this.dropdownState.parent.currentItem === this) ||
				(this.dropdownState.isOpen &&
					this.dropdownState.items &&
					this === this.dropdownState.items[0])) &&
			!this.dropdownState.closeOnSelect
		);
	}

	public get nativeElement(): HTMLElement {
		return this.el.nativeElement;
	}

	public get stateService(): DropdownStateService {
		return this.dropdownState;
	}

	@Input() public set disabled(value: boolean) {
		this._isDisabled = value;
	}

	@HostListener('click', ['$event'])
	public onClick(event: MouseEvent) {
		if (this.isDisabled) {
			event.preventDefault();
			event.stopPropagation();

			return;
		}

		this.activate.emit();

		if (this.isDropdownToggle === undefined && this.closeOnSelect) {
			this.dropdownState.closeAndFocusFirst();
		}
	}

	@HostListener('mouseenter')
	public onMouseEnter() {
		if (this.dropdownState.child) {
			this.dropdownState.closeRecursive(this.dropdownState.child);
		}

		this.dropdownState.currentItem = this;
		this.focus();
	}

	@HostListener('mouseleave')
	public onMouseLeave() {
		this.dropdownState.currentItem = null;
		this.blur();
	}

	@HostListener('keydown', ['$event'])
	public onEnterDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			this.activate.emit();

			if (this.closeOnSelect) {
				if (this.closeMode === 'subtree') {
					this.dropdownState.closeAndFocusFirst();
				} else {
					this.dropdownState.closeTree(this.dropdownState);
				}
			}
		}
	}

	public focus() {
		this.nativeElement.focus();
	}

	public blur() {
		this.nativeElement.blur();
	}
}
