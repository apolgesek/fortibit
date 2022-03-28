import { Directive, ElementRef, HostListener } from '@angular/core';
@Directive({
  selector: '[appBlurEnter]'
})
export class BlurEnterDirective {
  constructor(
    private readonly element: ElementRef,
  ) { }

  @HostListener('document:keydown.enter', ['$event']) onKeydown() {
    this.element.nativeElement.blur();
  }
}
