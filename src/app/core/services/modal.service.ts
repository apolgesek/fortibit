import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  ComponentFactoryResolver,
  ComponentRef,
  EmbeddedViewRef,
  Inject,
  Injectable,
  Injector,
  Renderer2,
  RendererFactory2,
  Type
} from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';

@Injectable({ providedIn: 'root' })
export class ModalService {
  public openedModals: ComponentRef<unknown>[] = [];
  private renderer: Renderer2;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector,
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  open<T extends IModal>(component: Type<T>, additionalData?: IAdditionalData) {
    const componentRef = this.componentFactoryResolver.resolveComponentFactory(component).create(this.injector);
    const componentInstance = componentRef.instance as T;

    componentInstance.ref = componentRef;
    componentInstance.additionalData = additionalData;
    this.appRef.attachView(componentRef.hostView);

    const domElem = (componentRef.hostView as EmbeddedViewRef<T>)
      .rootNodes[0] as HTMLElement;

    this.openedModals.push(componentRef);

    this.renderer.appendChild(this.document.body, domElem);
  }

  close<T>(componentRef: ComponentRef<T>) {
    this.openedModals.splice(this.openedModals.findIndex(x => x === componentRef), 1);
    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();
  }
}
