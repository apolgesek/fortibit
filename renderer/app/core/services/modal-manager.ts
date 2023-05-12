import {
  ApplicationRef,
  ComponentRef,
  Injectable,
  Injector,
  Type,
} from '@angular/core';
import { IAdditionalData, IModal } from '@app/shared';
import { fromEvent, Subject, take } from 'rxjs';
import { AppViewContainer } from './app-view-container';
import { ModalRef } from './modal-ref';

@Injectable({ providedIn: 'root' })
export class ModalManager {
  public openedModals: ComponentRef<any>[] = [];
  private _isOpening = false;

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly appViewContainer: AppViewContainer,
  ) {
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

  openPrompt<T extends IModal>(component: Type<T>): Promise<boolean> {
    return new Promise((resolve) => {
      const modalRef = this.open(component);
      modalRef.onActionResult.pipe(take(1)).subscribe(value => {
        resolve(value);
      });
    });
  }

  open<T extends IModal>(component: Type<T>, additionalData?: IAdditionalData) : ModalRef {
    // prevent multi open if opens on promise fullfillment
    if (this.openedModals.some(x => x.componentType === component)) {
      return;
    }

    const injector: Injector = Injector.create({ providers: [{ provide: ModalRef }], parent: this.appRef.injector });
    const modalRef = injector.get(ModalRef);

    modalRef.showBackdrop = true;

    if (this.openedModals.length > 0) {
      modalRef.showBackdrop = false;
    }

    const componentRef = this.appViewContainer.getRootViewContainer().createComponent(component, { injector: injector });
    const componentInstance = componentRef.instance as T;

    modalRef.ref = componentRef;
    modalRef.onClose = new Subject<void>();
    modalRef.onActionResult = new Subject<boolean>();
    // set component properties
    componentInstance.additionalData = additionalData;
    this.openedModals.push(componentRef);

    return modalRef;
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
