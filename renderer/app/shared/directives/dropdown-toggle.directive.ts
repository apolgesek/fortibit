import {
	AfterViewInit,
	Directive,
	ElementRef,
	HostBinding,
	Input,
	OnDestroy,
	Renderer2,
} from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

type TriggerType = 'click' | 'hover';

@Directive({
	selector: '[appDropdownToggle]',
	standalone: true,
})
export class DropdownToggleDirective implements AfterViewInit, OnDestroy {
	@Input() public trigger: TriggerType = 'click';
	@Input() public disabled = false;
	@HostBinding('class') public readonly class = 'dropdown-btn';
	@HostBinding('attr.aria-haspopup') public readonly ariaHaspopup = 'true';

	private listeners: (() => void)[] = [];

	constructor(
		private readonly element: ElementRef,
		private readonly renderer: Renderer2,
		private readonly dropdownState: DropdownStateService,
	) {}

	@HostBinding('attr.aria-expanded')
	@HostBinding('class.expanded')
	public get isExpanded(): boolean {
		return this.dropdownState.isOpen;
	}

	ngAfterViewInit() {
		switch (this.trigger) {
			case 'click':
				this.handleClick();
				break;
			case 'hover':
				if (this.disabled) {
					return;
				}

				this.handleHover();
				break;
			default:
				throw new Error('Unsupported trigger type');
		}
	}

	ngOnDestroy(): void {
		this.listeners.forEach((unlisten) => unlisten());
	}

	private handleHover() {
		const mouseOverListener = this.renderer.listen(
			this.element.nativeElement,
			'mouseenter',
			() => {
				if (this.dropdownState.isOpen) {
					return;
				}

				this.dropdownState.open();
			},
		);

		const parent = this.renderer.parentNode(this.element.nativeElement);
		const mouseLeaveListener = this.renderer.listen(
			parent,
			'mouseleave',
			() => {
				if (this.dropdownState.isOpen) {
					this.dropdownState.close();
				}
			},
		);

		this.listeners.push(mouseOverListener, mouseLeaveListener);
	}

	private handleClick() {
		const enterKeydownListener = this.renderer.listen(
			this.element.nativeElement,
			'keydown',
			(event: KeyboardEvent) => {
				if (event.key === 'Enter' && !this.dropdownState.isOpen) {
					this.dropdownState.open();
					event.preventDefault();
				}
			},
		);

		const clickListener = this.renderer.listen(
			this.element.nativeElement,
			'click',
			(_: MouseEvent) => {
				if (this.dropdownState.isOpen) {
					this.dropdownState.close();
				} else {
					this.dropdownState.open();
				}
			},
		);

		const outsideClickListener = this.renderer.listen(
			window,
			'click',
			(event: MouseEvent) => {
				const el = this.element.nativeElement as HTMLElement;
				const eventTarget = event.target as HTMLElement;

				if (!el.parentElement.contains(eventTarget)) {
					this.dropdownState.close();
				}
			},
		);

		const listeners = [
			enterKeydownListener,
			clickListener,
			outsideClickListener,
		];
		this.listeners.push(...listeners);
	}
}
