import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ContentChild, DestroyRef, ElementRef, Input, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalRef } from '@app/core/services';
import { ModalManager } from '@app/core/services/modal-manager';
import { IAdditionalData } from '@app/shared';
import { UiUtil } from '@app/utils';
import * as focusTrap from 'focus-trap';
import { fromEvent } from 'rxjs';

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
  @ViewChild('backdrop') public backdrop!: ElementRef;
  @ContentChild('autofocus', { descendants: true }) public autofocusElement: ElementRef;
  public showBackdrop: boolean;

  private focusTrap: focusTrap.FocusTrap;

  constructor(
    private readonly el: ElementRef,
    private readonly modalManager: ModalManager,
    private readonly modalRef: ModalRef,
    private readonly destroyRef: DestroyRef
  ) {
    this.showBackdrop = this.modalRef.showBackdrop;
  }

  ngAfterViewInit(): void {
    if (this.options?.closeOnBackdropClick) {
      fromEvent(this.backdrop.nativeElement, 'click')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.modalManager.close(this.modalRef.ref);
        });
    }

    // outside click must be enabled for any outer elements,, e.g. notification
    this.focusTrap = focusTrap.createFocusTrap(this.el.nativeElement, {
      allowOutsideClick: true,
      initialFocus: this.autofocusElement?.nativeElement
    });
    this.focusTrap.activate();
    UiUtil.unlockInterface();
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
    this.focusTrap = null;
  }
}
