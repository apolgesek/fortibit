import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

@Directive({
  selector: '[appDropdownToggle]',
  host: {
    'class': 'dropbtn' 
  }
})
export class DropdownToggleDirective implements AfterViewInit, OnDestroy {
  @Input() public trigger: 'click' | 'hover' = 'click';

  private readonly disabledClass = 'disabled';
  private unlisten: (() => void)[] = [];

  constructor(
    private readonly element: ElementRef,
    private readonly renderer: Renderer2,
    private readonly dropdownState: DropdownStateService
  ) {}

  ngAfterViewInit() {
    if (this.trigger === 'click') {
      this.renderer.listen(this.element.nativeElement, 'click', () => {
        if (this.dropdownState.isOpen) {
          this.dropdownState.close();
        } else {
          this.dropdownState.open();
        }
      });

      const listener = this.renderer.listen(window, 'click', (event: MouseEvent) => {
        const el = this.element.nativeElement as HTMLElement;
        const eventTarget = event.target as HTMLElement;
  
        if (!el.contains(eventTarget) && !eventTarget.classList.contains(this.disabledClass)) {
          this.dropdownState.close();
        }
      });

      this.unlisten.push(listener);

    } else if (this.trigger === 'hover') {
      const mouseOverListener = this.renderer.listen(this.element.nativeElement, 'mouseenter', () => {
        if (this.dropdownState.isOpen) {
          return;
        }

        this.dropdownState.open();
      });

      const mouseLeaveListener = this.renderer.listen(this.renderer.parentNode(this.element.nativeElement), 'mouseleave', () => {
        if (this.dropdownState.isOpen) {
          this.dropdownState.close();
        }
      });

      this.unlisten.push(mouseOverListener, mouseLeaveListener);
    }   
  }

  ngOnDestroy(): void {
    this.unlisten.forEach(unlisten => unlisten());
  }
}
