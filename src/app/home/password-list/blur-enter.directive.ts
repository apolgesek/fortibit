import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appBlurEnter]'
})
export class BlurEnterDirective {

    @HostListener('document:keydown.enter', ['$event']) onKeydownHandler() {
        this.element.nativeElement.blur();
    }
    
    constructor(
      private element: ElementRef,
    ) { }

}
