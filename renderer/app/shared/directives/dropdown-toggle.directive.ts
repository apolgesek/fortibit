import { AfterViewInit, Directive, ElementRef, HostBinding, Input, OnDestroy, Renderer2 } from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

enum TriggerType {
  Click = 'click',
  Hover = 'hover'
}

@Directive({
  selector: '[appDropdownToggle]',
  host: {
    'class': 'dropbtn',
    'aria-haspopup': 'true',
  },
  standalone: true
})
export class DropdownToggleDirective implements AfterViewInit, OnDestroy {
  @Input() public trigger: TriggerType = TriggerType.Click;
  @Input() public disabled = false;

  private listeners: (() => void)[] = [];

  constructor(
    private readonly element: ElementRef,
    private readonly renderer: Renderer2,
    private readonly dropdownState: DropdownStateService
  ) {}

  @HostBinding('attr.aria-expanded')
  @HostBinding('class.expanded')
  public get isExpanded(): boolean {
    return this.dropdownState.isOpen;
  }

  ngAfterViewInit() {
    switch (this.trigger) {
      case TriggerType.Click:
        this.handleClick();
        break;
      case TriggerType.Hover:
        if (this.disabled) {
          return;
        }
  
        this.handleHover();
        break;
      default:
        throw new Error('Unsupported trigger type');
    }
  }

  private handleHover() {
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

    this.listeners.push(mouseOverListener, mouseLeaveListener);
  }

  private handleClick() {
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

      if (!el.parentElement.contains(eventTarget)) {
        this.dropdownState.close();
      }
    });

    this.listeners.push(listener);
  }

  ngOnDestroy(): void {
    this.listeners.forEach(unlisten => unlisten());
  }
}
