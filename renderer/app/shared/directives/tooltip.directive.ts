import { AppViewContainer } from '@app/core/services';
import {
	AfterViewInit,
	ApplicationRef,
	ComponentRef,
	Directive,
	ElementRef,
	EmbeddedViewRef,
	HostListener,
	Input,
	OnDestroy,
	Renderer2,
	inject,
} from '@angular/core';
import { TooltipComponent } from '../components/tooltip/tooltip.component';
import { DOCUMENT } from '@angular/common';

@Directive({
	selector: '[appTooltip]',
	standalone: true,
})
export class TooltipDirective implements AfterViewInit, OnDestroy {
	@Input('appTooltip') public tooltipText: string;
	// default is relative to parent positioning
	@Input() public container: 'default' | 'body' = 'default';
	@Input() public static = false;
	@Input() public set show(value: boolean) {
		if (value) {
			if (this.componentRef) {
				return;
			}

			this.createTooltipComponent();
		} else {
			if (this.componentRef) {
				this.destroyTooltipComponent();
			}
		}
	}

	private componentRef!: ComponentRef<TooltipComponent>;
	private timeout: number;
	private mouseEntered = false;
	private observer: MutationObserver;

	private readonly appViewContainer = inject(AppViewContainer);
	private readonly elRef = inject(ElementRef);
	private readonly renderer = inject(Renderer2);
	private readonly appRef = inject(ApplicationRef);
	private readonly document = inject(DOCUMENT);

	@HostListener('focusin', ['$event'])
	@HostListener('mouseenter', ['$event'])
	public onMouseEnter() {
		if (this.static) {
			return;
		}

		if (this.mouseEntered) {
			return;
		}

		this.mouseEntered = true;
		if (!this.tooltipText?.trim()) {
			return;
		}

		this.timeout = window.setTimeout(() => {
			this.createTooltipComponent();
		}, 500);
	}

	@HostListener('focusout', ['$event'])
	@HostListener('mouseleave', ['$event'])
	public onMouseLeave() {
		if (this.static) {
			return;
		}

		this.mouseEntered = false;
		if (this.componentRef) {
			this.destroyTooltipComponent();
		} else {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}

	ngAfterViewInit(): void {
		if (this.static && this.show) {
			this.createTooltipComponent();
		}
	}
	ngOnDestroy(): void {
		if (this.componentRef) {
			this.destroyTooltipComponent();
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
