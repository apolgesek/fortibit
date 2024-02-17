import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
	selector: '[appAutofocus]',
	standalone: true,
})
export class AutofocusDirective implements AfterViewInit {
	constructor(private readonly element: ElementRef) {}

	ngAfterViewInit(): void {
		(this.element.nativeElement as HTMLElement).focus();
	}
}
