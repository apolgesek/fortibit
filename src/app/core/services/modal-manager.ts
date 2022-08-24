import {
  ApplicationRef,
  ComponentRef,
  EmbeddedViewRef,
  Injectable,
  Injector,
  Renderer2,
  RendererFactory2,
  Type,
} from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';
import { fromEvent } from 'rxjs';
import { AppViewContainer } from './app-view-container';
import { ModalRef } from './modal-ref';

@Injectable({ providedIn: 'root' })
export class ModalManager {
  public openedModals: ComponentRef<any>[] = [];
  private renderer: Renderer2;

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly rendererFactory: RendererFactory2,
    private readonly appViewContainer: AppViewContainer
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);

    fromEvent(window, 'keydown')
    .subscribe((event: Event) => {
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

  open<T extends IModal>(component: Type<T>, additionalData?: IAdditionalData) {
    const injector: Injector = Injector.create({ providers: [{ provide: ModalRef }], parent: this.appRef.injector });
    const modalRef = injector.get(ModalRef);

    modalRef.showBackdrop = true;

    if (this.openedModals.length > 0) {
      modalRef.showBackdrop = false;
    }

    const componentRef = this.appViewContainer.getRootViewContainer().createComponent(component, { injector: injector });
    const componentInstance = componentRef.instance as T;

    modalRef.ref = componentRef;
    // set component properties
    componentInstance.additionalData = additionalData;

    const modal = (componentRef.hostView as EmbeddedViewRef<T>).rootNodes[0] as HTMLElement;
    const root = (this.appRef.components[0].hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(root, modal);

    this.openedModals.push(componentRef);
  }

  close<T>(componentRef: ComponentRef<T>) {  
    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();

    const modal = this.openedModals.find(x => x === componentRef);

    if (modal) {
      this.openedModals.splice(this.openedModals.indexOf(modal), 1);
    }
  }
}
