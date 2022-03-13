import { Directive, ElementRef, HostBinding, HostListener, Input } from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

@Directive({
  selector: '[appMenuItem]'
})
export class MenuItemDirective {
  @Input() public set disabled(value: boolean) {
    this._isDisabled = value;
  }

  private _isDisabled = false;

  constructor(
    private readonly dropdownState: DropdownStateService,
    private readonly el: ElementRef,
  ) { }

  public get stateService(): DropdownStateService {
    return this.dropdownState;
  }

  private get nativeElement(): HTMLElement {
    return this.el.nativeElement;
  }

  @HostBinding('class.disabled')
  public get isDisabled(): boolean {
    return this._isDisabled;
  }

  @HostBinding('class.focused')
  public get isFocused(): boolean {  
    return this.dropdownState.currentItem === this
      || (this.dropdownState.parent && this.dropdownState.parent.currentItem === this)
      || (this.dropdownState.isOpen && this.dropdownState.items && this === this.dropdownState.items[0]);
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
    this.dropdownState.currentItem = undefined;
  }

  public focus() {
    this.nativeElement.focus();
  }
}
