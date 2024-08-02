import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
	selector: '[appAutofocus]',
	standalone: true,
})
export class AutofocusDirective implements AfterViewInit {
	private readonly element = inject(ElementRef);

	ngAfterViewInit(): void {
		(this.element.nativeElement as HTMLElement).focus();
	}
}
