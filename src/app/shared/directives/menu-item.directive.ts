import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

@Directive({
  selector: '[appMenuItem]',
  host: {
    'role': 'menuitem',
    'aria-hidden': 'true'
  },
})
export class MenuItemDirective {
  @Output() activate = new EventEmitter();
  @Input() public set disabled(value: boolean) {
    this._isDisabled = value;
  }

  @Input() public closeOnSelect: boolean = false;

  private _isDisabled = false;

  constructor(
    private readonly dropdownState: DropdownStateService,
    private readonly el: ElementRef,
  ) { }

  public get stateService(): DropdownStateService {
    return this.dropdownState;
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement;
  }

  @HostBinding('class.disabled')
  @HostBinding('attr.aria-disabled')
  public get isDisabled(): boolean {
    return this._isDisabled;
  }

  @HostBinding('class.focused')
  public get isFocused(): boolean {  
    return this.dropdownState.currentItem === this
      || (this.dropdownState.parent && this.dropdownState.parent.currentItem === this)
      || (this.dropdownState.isOpen && this.dropdownState.items && this === this.dropdownState.items[0]);
  }

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent) {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    this.activate.emit();

    if (this.closeOnSelect) {
      this.dropdownState.closeAndFocusFirst();
    }

    event.preventDefault();
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

  public focus() {
    this.nativeElement.focus();
  }

  public blur() {
    this.nativeElement.blur();
  }
}
