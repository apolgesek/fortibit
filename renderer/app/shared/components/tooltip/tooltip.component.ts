import {
	AfterViewInit,
	Component,
	ElementRef,
	HostBinding,
	OnInit,
	inject,
} from '@angular/core';

@Component({
	selector: 'app-tooltip',
	templateUrl: './tooltip.component.html',
	styleUrls: ['./tooltip.component.scss'],
	standalone: true,
})
export class TooltipComponent implements OnInit, AfterViewInit {
	@HostBinding('attr.id')
	@HostBinding('attr.role')
	public readonly role = 'tooltip';

	public text: string;
	public triggerElement: HTMLElement;
	public container: 'default' | 'body';
	private readonly marginPx = 5;
	private readonly element = inject(ElementRef);

	ngOnInit() {
		if (!this.triggerElement) {
			throw new Error('Missing trigger element for a tooltip');
		}

		if (!this.container) {
			throw new Error('Container not specified for a tooltip');
		}
	}

	ngAfterViewInit() {
		this.positionElement(this.element.nativeElement);
		this.element.nativeElement.style.visibility = 'visible';
	}

	private positionElement(element: HTMLElement) {
		const triggerRect = this.triggerElement.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();
		let xPos: number;
		let yPos: number;

		if (this.container === 'default') {
			xPos = Math.round(
				this.triggerElement.offsetLeft +
					triggerRect.width / 2 -
					elementRect.width / 2,
			);

			if (elementRect.width + xPos > window.innerWidth) {
				xPos -= Math.ceil(elementRect.width + xPos - window.innerWidth);
			} else if (xPos < 0) {
				xPos = 0;
			}

			yPos =
				this.triggerElement.offsetTop +
				this.triggerElement.clientHeight +
				this.marginPx;

			if (yPos + elementRect.height > window.innerHeight) {
				yPos -= triggerRect.height + elementRect.height + this.marginPx * 2; // doubled to add negative top margin
			}
		} else {
			xPos = Math.round(
				triggerRect.left + triggerRect.width / 2 - elementRect.width / 2,
			);

			if (elementRect.width + xPos > window.innerWidth) {
				xPos -= Math.ceil(elementRect.width + xPos - window.innerWidth);
			} else if (xPos < 0) {
				xPos = 0;
			}

			yPos = triggerRect.top + this.triggerElement.clientHeight + this.marginPx;

			if (yPos + elementRect.height > window.innerHeight) {
				yPos -= triggerRect.height + elementRect.height + this.marginPx * 2; // doubled to add negative top margin
			}
		}

		element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
	}
}
