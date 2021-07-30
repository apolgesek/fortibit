import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener } from '@angular/core';
@Directive({
  selector: '[appDropdown]'
})
export class DropdownDirective implements AfterViewInit {
  private readonly visibleClass = 'show';

  constructor(private element: ElementRef) {}

  get nextSibling(): HTMLElement {
    return (this.element.nativeElement as HTMLElement).nextSibling as HTMLElement;
  }

  @HostListener('click')
  public toggleDropdownVisibility() {
    this.nextSibling.classList.toggle(this.visibleClass);
  }

  @HostBinding('class.active')
  get btnClass() {
    return this.nextSibling.classList.contains(this.visibleClass);
  }

  ngAfterViewInit() {
    window.addEventListener('click', (event: MouseEvent) => {
      const el = this.element.nativeElement as HTMLElement;

      if (!el.contains(event.target as HTMLElement)) {
        if (this.nextSibling.classList.contains(this.visibleClass)) {
          this.nextSibling.classList.remove(this.visibleClass);
        }
      }
    });
  }
}
