import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injectable, Injector, Renderer2, RendererFactory2 } from '@angular/core';
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
    const instance = componentRef.instance as NotificationComponent;

    instance.model = model;
    instance.componentRef = componentRef;

    const notification = (componentRef.hostView as EmbeddedViewRef<NotificationComponent>).rootNodes[0] as HTMLElement;
    const root = (this.appRef.components[0].hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(root, notification);

    this.toasts.push(componentRef);
  }

  public remove(ref: ComponentRef<NotificationComponent>) {
    this.appRef.detachView(ref.hostView);
    ref.destroy();

    const idx = this.toasts.findIndex(x => x === ref);
    this.toasts.splice(idx, 1);
  }
}
