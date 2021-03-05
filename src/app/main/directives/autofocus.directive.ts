import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[appAutofocus]'
})
export class AutofocusDirective {
  constructor(
    private element: ElementRef,
  ) { }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const element: HTMLInputElement = this.element.nativeElement;
      element.focus();

      if (element instanceof HTMLInputElement) {
        element.setSelectionRange(0, 0);
      }
    });
  }
}
