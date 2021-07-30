import { AfterViewInit, Component, ComponentRef, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { ModalService } from '@app/core/services';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('backdrop') public backdrop!: ElementRef; 
  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private modalService: ModalService,
  ) {}

  ngAfterViewInit(): void {
    fromEvent(this.backdrop.nativeElement, 'click')
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.modalService.close(this.modalService.openedModals.pop() as ComponentRef<unknown>);
      });

    fromEvent(window, 'keydown')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((event: Event) => {
        if ((event as KeyboardEvent).key === 'Escape') {
          this.modalService.close(this.modalService.openedModals.pop() as ComponentRef<unknown>);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}