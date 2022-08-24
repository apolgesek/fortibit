import { ComponentRef, Injectable } from '@angular/core';
import { ModalManager } from './modal-manager';

@Injectable({
  providedIn: 'root'
})
export class ModalRef {
  public showBackdrop = true;
  public ref: ComponentRef<any>;

  constructor(private readonly modalManager: ModalManager) { }

  close() {
    this.modalManager.close(this.ref);
  }
}
