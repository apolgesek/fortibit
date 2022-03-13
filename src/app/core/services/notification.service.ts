import { DOCUMENT } from '@angular/common';
import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Inject, Injectable, Injector, NgZone, Renderer2, RendererFactory2 } from '@angular/core';
import { NotificationComponent } from '@app/shared/components/notification/notification.component';
import { IpcChannel } from '@shared-renderer/index';
import { IToastModel } from '../models';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private renderer: Renderer2;
  private toasts: ComponentRef<NotificationComponent>[] = [];

  constructor(
    private readonly zone: NgZone,
    private readonly rendererFactory: RendererFactory2,
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    private readonly injector: Injector,
    private readonly appRef: ApplicationRef,
    private readonly electronService: ElectronService,
    private readonly storageService: StorageService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);

    this.electronService.ipcRenderer.on(IpcChannel.GetSaveStatus, (_, { status, message, file }) => {
      this.zone.run(() => {
        if (status) {
          this.storageService.setDateSaved();
          this.storageService.file = { filePath: file, filename: file.split('\\').splice(-1)[0] };

          this.add({
            message: 'Database saved',
            alive: 5000,
            type: 'success'
          });
        } else if (message) {
          this.add({
            type: 'error',
            message: 'Error occured',
            alive: 5000,
          });
        }
      });
    });
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
