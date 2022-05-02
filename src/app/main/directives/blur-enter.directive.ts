import { Directive, ElementRef, HostListener } from '@angular/core';
@Directive({
  selector: '[appBlurEnter]'
})
export class BlurEnterDirective {
  constructor(
    private readonly element: ElementRef,
  ) { }

  @HostListener('keydown.enter', ['$event']) onEnterDown() {
    this.element.nativeElement.blur();
  }
}
