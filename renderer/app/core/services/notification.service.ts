import { ApplicationRef, ComponentRef, EmbeddedViewRef, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { NotificationComponent } from '../../shared/components/notification/notification.component';
import { Toast } from '../models';
import { AppViewContainer } from './app-view-container';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private renderer: Renderer2;
  private toasts: ComponentRef<NotificationComponent>[] = [];

  constructor(
    private readonly rendererFactory: RendererFactory2,
    private readonly appRef: ApplicationRef,
    private readonly appViewContainer: AppViewContainer
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  public add(model: Toast) {
    this.toasts.forEach((ref) => {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
    });

    this.toasts = [];

    const componentRef = this.appViewContainer.getRootViewContainer().createComponent(NotificationComponent);
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

  public isActive(model: Toast): boolean {
    return this.toasts.some(x => this.isEqual(x, model));
  }

  private isEqual(toast: ComponentRef<NotificationComponent>, model: Toast): boolean {
    return toast.instance.model.message === model.message && toast.instance.model.type === model.type;
  }
}
