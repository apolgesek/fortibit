import { DOCUMENT } from '@angular/common';
import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Inject, Injectable, Injector, Renderer2, RendererFactory2 } from '@angular/core';
import { NotificationComponent } from '@app/shared/components/notification/notification.component';
import { IToastModel } from '../models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private renderer: Renderer2;
  private toasts: ComponentRef<NotificationComponent>[] = [];

  constructor(
    private readonly rendererFactory: RendererFactory2,
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    private readonly injector: Injector,
    private readonly appRef: ApplicationRef,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  add(model: IToastModel) {
    this.toasts.forEach((componentRef) => {
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    });

    this.toasts = [];

    const componentRef = this.componentFactoryResolver.resolveComponentFactory(NotificationComponent).create(this.injector);
    this.appRef.attachView(componentRef.hostView);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    (<any>componentRef.instance).model = model;
    (<any>componentRef.instance).componentRef = componentRef;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const domElem = (componentRef.hostView as EmbeddedViewRef<NotificationComponent>).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(this.document.body, domElem);

    this.toasts.push(componentRef);
  }

  public remove(ref: ComponentRef<NotificationComponent>) {
    this.appRef.detachView(ref.hostView);
    ref.destroy();

    const idx = this.toasts.findIndex(x => x === ref);
    this.toasts.splice(idx, 1);
  }
}
