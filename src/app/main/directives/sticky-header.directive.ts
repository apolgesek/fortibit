import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive({
  selector: '[appStickyHeader]'
})
export class StickyHeaderDirective implements AfterViewInit, OnDestroy{
  private readonly className = 'scrolled';
  private readonly destroyed$ = new Subject<void>();

  private observer: IntersectionObserver;
  private observedElement: HTMLElement;

  constructor(
    private elementRef: ElementRef,
    private storageService: StorageService
  ) { }

  ngAfterViewInit() {
    const options: IntersectionObserverInit = {
      root: this.elementRef.nativeElement,
      threshold: 1
    };

    const tableHeaderClasses = this.getTableHeaderClasses();
    this.observer = new IntersectionObserver((changes: IntersectionObserverEntry[]) => {
      changes.forEach(change => {
        change.isIntersecting
          ? tableHeaderClasses.remove(this.className)
          : tableHeaderClasses.add(this.className);
      });
    }, options);

    this.observedElement = this.getFirstRow();
    if (this.observedElement) {
      this.observer.observe(this.observedElement);
    }

    this.reassignObservedOnPasswordListChange();
  }

  ngOnDestroy() {
    if (this.observedElement) {
      this.observer.unobserve(this.observedElement);
    }

    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private getFirstRow(): HTMLElement {
    return this.elementRef.nativeElement.querySelector('tbody tr:first-child') as HTMLElement;
  }

  private getTableHeaderClasses(): DOMTokenList {
    return (this.elementRef.nativeElement.querySelector('thead > div') as HTMLElement).classList;
  }

  private reassignObservedOnPasswordListChange() {
    this.storageService.entries$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      requestAnimationFrame(() => {
        this.getTableHeaderClasses().remove(this.className);

        if (this.observedElement) {
          this.observer.unobserve(this.observedElement);
        }

        this.observedElement = this.getFirstRow();

        if (this.observedElement) {
          this.observer.observe(this.observedElement);
        }
      });
    });
  }
}
