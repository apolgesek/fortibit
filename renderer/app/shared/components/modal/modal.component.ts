import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ContentChild, DestroyRef, ElementRef, HostBinding, Input, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
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
  @HostBinding('attr.role') public readonly role = 'dialog';

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
    // prevent close button focus when modal shows
    const closeDialogButton = (this.el.nativeElement as HTMLElement).querySelector('.close-dialog');
    if (closeDialogButton) {
      closeDialogButton.setAttribute('tabindex', '-1');
      setTimeout(() => {
        closeDialogButton.setAttribute('tabindex', '0');
      });
    }
    
    if (this.options?.closeOnBackdropClick) {
      fromEvent(this.backdrop.nativeElement, 'click')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.modalManager.close(this.modalRef.ref);
        });
    }

    (document.activeElement as HTMLElement).blur();
    // outside click must be enabled for any outer elements,, e.g. notification
    this.focusTrap = focusTrap.createFocusTrap(this.el.nativeElement, {
      returnFocusOnDeactivate: false,
      allowOutsideClick: true,
      initialFocus: this.autofocusElement?.nativeElement ?? false
    });
    this.focusTrap.activate();
    UiUtil.unlockInterface();
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
    this.focusTrap = null;
  }
}
