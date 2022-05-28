import {
  ApplicationRef,
  ComponentRef,
  EmbeddedViewRef,
  Injectable,
  Renderer2,
  RendererFactory2,
  Type
} from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalFactory } from '@app/core/services/modal-factory';

@Injectable({ providedIn: 'root' })
export class ModalManager {
  public openedModals: ComponentRef<any>[] = [];
  private renderer: Renderer2;

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly rendererFactory: RendererFactory2,
    private readonly modalFactoryService: ModalFactory,
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  get isAnyModalOpen(): boolean {
    return this.openedModals.length > 0;
  }

  open<T extends IModal>(component: Type<T>, additionalData?: IAdditionalData) {
    const componentRef = this.modalFactoryService.create(component, additionalData);

    this.appRef.attachView(componentRef.hostView);
    const modal = (componentRef.hostView as EmbeddedViewRef<T>).rootNodes[0] as HTMLElement;
    const root = (this.appRef.components[0].hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(root, modal);

    this.openedModals.push(componentRef);
  }

  close<T>(componentRef: ComponentRef<T>) {  
    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();

    this.openedModals.splice(this.openedModals.findIndex(x => x === componentRef), 1);
  }
}
