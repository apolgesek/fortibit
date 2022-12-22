import { ComponentRef, EventEmitter, Injectable } from '@angular/core';
import { ModalManager } from './modal-manager';

@Injectable({
  providedIn: 'root'
})
export class ModalRef {
  public showBackdrop = true;
  public ref: ComponentRef<any>;
  public onClose: EventEmitter<void>;

  constructor(private readonly modalManager: ModalManager) { }

  close() {
    this.onClose.emit();
    this.modalManager.close(this.ref);
  }
}
