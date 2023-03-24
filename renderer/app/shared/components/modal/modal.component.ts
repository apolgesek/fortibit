import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { ModalRef } from '@app/core/services';
import { ModalManager } from '@app/core/services/modal-manager';
import { IAdditionalData } from '@app/shared';
import * as focusTrap from 'focus-trap';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule
  ],
  encapsulation: ViewEncapsulation.None,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  @Input() public options!: IAdditionalData;
  @Input() public bodyClass!: string;

  public showBackdrop: boolean;

  @ViewChild('backdrop') public backdrop!: ElementRef;

  private readonly destroyed: Subject<void> = new Subject();
  private focusTrap: focusTrap.FocusTrap;

  constructor(
    private readonly el: ElementRef,
    private readonly modalManager: ModalManager,
    private readonly modalRef: ModalRef
  ) {
    this.showBackdrop = this.modalRef.showBackdrop;
  }

  ngAfterViewInit(): void {
    if (this.options?.closeOnBackdropClick) {
      fromEvent(this.backdrop.nativeElement, 'click')
        .pipe(takeUntil(this.destroyed))
        .subscribe(() => {
          this.modalManager.close(this.modalRef.ref);
        });
    }

    // outside click must be enabled for any outer elements,, e.g. notification
    this.focusTrap = focusTrap.createFocusTrap(this.el.nativeElement, { allowOutsideClick: true, initialFocus: false });
    this.focusTrap.activate();
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
    this.focusTrap = null;

    this.destroyed.next();
    this.destroyed.complete();
  }
}