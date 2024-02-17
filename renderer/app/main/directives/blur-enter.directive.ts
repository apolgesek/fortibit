import { Directive, ElementRef, HostListener } from '@angular/core';
@Directive({
	selector: '[appBlurEnter]',
	standalone: true,
})
export class BlurEnterDirective {
	constructor(private readonly element: ElementRef) {}

	@HostListener('keydown.enter', ['$event']) onEnterDown() {
		this.element.nativeElement.blur();
	}
}
