import { Directive, ElementRef, HostListener, inject } from '@angular/core';
@Directive({
	selector: '[appBlurEnter]',
	standalone: true,
})
export class BlurEnterDirective {
	private readonly element = inject(ElementRef);

	@HostListener('keydown.enter', ['$event']) onEnterDown() {
		this.element.nativeElement.blur();
	}
}
