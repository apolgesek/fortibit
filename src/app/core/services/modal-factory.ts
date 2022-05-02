import {
  ComponentFactoryResolver,
  ComponentRef,
  Injectable,
  Injector,
  Type
} from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';

@Injectable({ providedIn: 'root' })
export class ModalFactory {
  constructor(
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    private readonly injector: Injector,
  ) {}

  create<T extends IModal>(component: Type<T>, additionalData?: IAdditionalData): ComponentRef<T> {
    const componentRef = this.componentFactoryResolver.resolveComponentFactory(component).create(this.injector);
    const componentInstance = componentRef.instance as T;

    // set component properties
    componentInstance.ref = componentRef;
    componentInstance.additionalData = additionalData;

    return componentRef;
  }
}