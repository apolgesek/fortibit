import { AfterViewInit, Component, ComponentRef, ElementRef, Input, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { ModalManager } from '@app/core/services/modal-manager';
import { IAdditionalData } from '@app/shared';
import * as focusTrap from 'focus-trap';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  @Input() public options!: IAdditionalData;
  @Input() public bodyClass!: string;

  @ViewChild('backdrop') public backdrop!: ElementRef;

  private readonly destroyed: Subject<void> = new Subject();
  private focusTrap: focusTrap.FocusTrap;

  constructor(
    private readonly el: ElementRef,
    private readonly modalManager: ModalManager,
  ) {}

  ngAfterViewInit(): void {
    if (this.options?.closeOnBackdropClick) {
      fromEvent(this.backdrop.nativeElement, 'click')
        .pipe(takeUntil(this.destroyed))
        .subscribe(() => {
          this.modalManager.close(this.modalManager.openedModals.pop() as ComponentRef<unknown>);
        });
    }

    fromEvent(window, 'keydown')
      .pipe(takeUntil(this.destroyed))
      .subscribe((event: Event) => {
        if ((event as KeyboardEvent).key === 'Escape') {
          this.modalManager.close(this.modalManager.openedModals.pop() as ComponentRef<unknown>);
        }
      });

      this.focusTrap = focusTrap.createFocusTrap(this.el.nativeElement);
      this.focusTrap.activate();
  }

  ngOnDestroy(): void {
    this.focusTrap.deactivate();
    this.focusTrap = undefined;

    this.destroyed.next();
    this.destroyed.complete();
  }
}