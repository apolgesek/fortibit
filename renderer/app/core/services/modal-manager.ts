import {
	ApplicationRef,
	ComponentRef,
	Injectable,
	Injector,
	Renderer2,
	RendererFactory2,
	Type,
	inject,
} from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';
import { fromEvent, Subject, take } from 'rxjs';
import { AppViewContainer } from './app-view-container';
import { ModalRef } from './modal-ref';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ModalManager {
	public openedModals: ComponentRef<any>[] = [];

	private readonly renderer: Renderer2;
	private readonly bodyClass = 'modal-open';

	private readonly appRef = inject(ApplicationRef);
	private readonly appViewContainer = inject(AppViewContainer);
	private readonly rendererFactory = inject(RendererFactory2);
	private readonly document = inject(DOCUMENT);

	constructor() {
		this.renderer = this.rendererFactory.createRenderer(null, null);

		fromEvent(window, 'keydown').subscribe((event: Event) => {
			if ((event as KeyboardEvent).key === 'Escape') {
				if (this.openedModals.length === 0) {
					return;
				}

				this.close(this.openedModals.pop());
			}
		});
	}

	get isAnyModalOpen(): boolean {
		return this.openedModals.length > 0;
	}

	openPrompt<T extends IModal>(component: Type<T>): Promise<boolean> {
		return new Promise((resolve) => {
			const modalRef = this.open(component);

			modalRef.onActionResult.pipe(take(1)).subscribe((value) => {
				resolve(value);
			});
		});
	}

	open<P>(
		component: Type<IModal>,
		additionalData?: IAdditionalData<P>,
	): ModalRef {
		// prevent multi open if opens on promise fullfillment
		if (this.openedModals.some((x) => x.componentType === component)) {
			return;
		}

		const injector: Injector = Injector.create({
			providers: [{ provide: ModalRef }],
			parent: this.appRef.injector,
		});
		const modalRef = injector.get(ModalRef);

		modalRef.showBackdrop = true;

		if (this.openedModals.length > 0) {
			modalRef.showBackdrop = false;

			this.openedModals.forEach((modal) => {
				modal.injector.get(ModalRef).visible = false;
			});
		}

		const componentRef = this.appViewContainer
			.getRootViewContainer()
			.createComponent(component, { injector });

		modalRef.ref = componentRef;
		modalRef.onClose = new Subject<void>();
		modalRef.onActionResult = new Subject<boolean>();
		// set component properties
		componentRef.setInput('additionalData', additionalData);
		this.openedModals.push(componentRef);

		this.renderer.addClass(this.document.body, this.bodyClass);

		return modalRef;
	}

	close<T>(componentRef: ComponentRef<T>) {
		if (this.openedModals.length > 1) {
			// set previous modal visible again
			this.openedModals.at(-2).injector.get(ModalRef).visible = true;
			setTimeout(() => this.closeModal(componentRef), 0);
		} else {
			this.closeModal(componentRef);
		}
	}

	private closeModal<T>(componentRef: ComponentRef<T>) {
		this.appRef.detachView(componentRef.hostView);
		componentRef.destroy();

		const modal = this.openedModals.find((x) => x === componentRef);

		if (modal) {
			this.openedModals.splice(this.openedModals.indexOf(modal), 1);
		}

		if (this.openedModals.length === 0) {
			this.renderer.removeClass(this.document.body, this.bodyClass);
		}
	}
}
