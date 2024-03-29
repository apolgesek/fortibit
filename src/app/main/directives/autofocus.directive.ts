import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[appAutofocus]'
})
export class AutofocusDirective {
  constructor(
    private readonly element: ElementRef,
  ) { }

  ngAfterViewInit(): void {
    (this.element.nativeElement as HTMLElement).focus();
  }
}
