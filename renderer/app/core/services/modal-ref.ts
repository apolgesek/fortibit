import { ComponentRef, Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ModalManager } from './modal-manager';

@Injectable({
  providedIn: 'root'
})
export class ModalRef {
  public showBackdrop = true;
  public ref: ComponentRef<any>;
  public onClose: Subject<void>;
  public onActionResult: Subject<boolean>;

  private readonly modalManager = inject(ModalManager);

  close() {
    this.onClose.next();
    this.onClose.complete();
    
    this.modalManager.close(this.ref);
  }
}
