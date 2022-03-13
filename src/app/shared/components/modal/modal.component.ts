import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, Input, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { ModalService } from '@app/core/services';
import { IAdditionalData } from '@app/shared';
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

  constructor(
    private readonly modalService: ModalService,
  ) {}

  ngAfterViewInit(): void {
    if (this.options?.closeOnBackdropClick) {
      fromEvent(this.backdrop.nativeElement, 'click')
        .pipe(takeUntil(this.destroyed))
        .subscribe(() => {
          this.modalService.close(this.modalService.openedModals.pop() as ComponentRef<unknown>);
        });
    }

    fromEvent(window, 'keydown')
      .pipe(takeUntil(this.destroyed))
      .subscribe((event: Event) => {
        if ((event as KeyboardEvent).key === 'Escape') {
          this.modalService.close(this.modalService.openedModals.pop() as ComponentRef<unknown>);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }
}