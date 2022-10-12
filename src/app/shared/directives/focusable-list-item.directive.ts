import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { ListStateService } from '../services/list-state.service';

@Directive({
  selector: '[appFocusableListItem]',
  standalone: true
})
export class FocusableListItemDirective {
  @Input('appFocusableListItem') public item: any;

  public get elRef(): ElementRef {
    return this.elementRef;
  }

  constructor(
    private readonly listStateService: ListStateService,
    private readonly elementRef: ElementRef
  ) { }

  // detect whether entry gets focused by explicit mouse click - do not focus the first list element in that case 
  // used the fact that mousedown event is fired before focus event
  @HostListener('mousedown')
  public onMouseDown() {
    this.listStateService.lastFocused = this.item;
  }
}
