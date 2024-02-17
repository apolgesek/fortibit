import { AppViewContainer } from '@app/core/services';
import {
	ApplicationRef,
	ComponentRef,
	Directive,
	ElementRef,
	EmbeddedViewRef,
	HostListener,
	Inject,
	Input,
	Renderer2,
} from '@angular/core';
import { TooltipComponent } from '../components/tooltip/tooltip.component';
import { DOCUMENT } from '@angular/common';

@Directive({
	selector: '[appTooltip]',
	standalone: true,
})
export class TooltipDirective {
	@Input('appTooltip') public tooltipText: string;
	// default is relative to parent positioning
	@Input() public container: 'default' | 'body' = 'default';

	private componentRef!: ComponentRef<TooltipComponent>;
	private timeout: any;
	private mouseEntered = false;
	private observer: MutationObserver;

	constructor(
		private readonly appViewContainer: AppViewContainer,
		private readonly elRef: ElementRef,
		private readonly renderer: Renderer2,
		private readonly appRef: ApplicationRef,
		@Inject(DOCUMENT) private readonly document: Document,
	) {}

	@HostListener('focusin', ['$event'])
	@HostListener('mouseenter', ['$event'])
	public onMouseEnter() {
		if (this.mouseEntered) {
			return;
		}

		this.mouseEntered = true;
		if (!this.tooltipText?.trim()) {
			return;
		}

		this.timeout = setTimeout(() => {
			this.createTooltipComponent();
		}, 500);
	}

	@HostListener('focusout', ['$event'])
	@HostListener('mouseleave', ['$event'])
	public onMouseLeave() {
		this.mouseEntered = false;
		if (this.componentRef) {
			this.destroyTooltipComponent();
		} else {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}

	createTooltipComponent() {
		this.componentRef = this.appViewContainer
			.getRootViewContainer()
			.createComponent(TooltipComponent);
		this.componentRef.instance.triggerElement = this.elRef.nativeElement;
		this.componentRef.instance.text = this.tooltipText;
		this.componentRef.instance.container = this.container;

		const componentNode = (
			this.componentRef.hostView as EmbeddedViewRef<TooltipComponent>
		).rootNodes[0] as HTMLElement;
		const parent =
			this.container === 'default'
				? (this.elRef.nativeElement as HTMLElement).parentElement
				: this.document.body;
		this.renderer.appendChild(parent, componentNode);

		this.observer = new MutationObserver((mutationsList) => {
			mutationsList.forEach((mutation) => {
				mutation.removedNodes.forEach((removedNode) => {
					if (removedNode.contains(this.elRef.nativeElement)) {
						if (this.componentRef) {
							this.destroyTooltipComponent();
						}
						this.observer.disconnect();
					}
				});
			});
		});

		this.observer.observe(this.document.body, {
			subtree: true,
			childList: true,
		});
	}

	destroyTooltipComponent() {
		this.appRef.detachView(this.componentRef.hostView);
		this.componentRef.destroy();
		this.componentRef = null;
	}
}
