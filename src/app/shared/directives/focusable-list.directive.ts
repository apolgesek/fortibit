import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, QueryList, ViewChildren } from '@angular/core';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { ListStateService } from '../services/list-state.service';
import { FocusableListItemDirective } from './focusable-list-item.directive';

@Directive({
  selector: '[appFocusableList]',
  providers: [ListStateService]
})
export class FocusableListDirective implements AfterViewInit, OnDestroy {
  @ContentChildren(FocusableListItemDirective) public readonly rowEntries: QueryList<FocusableListItemDirective>;
  @Output() private readonly focused: EventEmitter<any> = new EventEmitter<any>();
  private _selected: any;

  @Input('selected')
  public set selected(value: any[]) {
    this._selected = value ? value[0] : null;
    this.listStateService.selected = this._selected;

    if (this._selected && this.rowEntries) {
      const item = this.rowEntries.find(x => x.item === this._selected);
      
      item && item.elRef.nativeElement.focus();
    }
  }

  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly elementRef: ElementRef,
    private readonly listStateService: ListStateService
  ) { }

  ngAfterViewInit() {
    this.handleFocus();

    this.rowEntries.changes.pipe(takeUntil(this.destroyed)).subscribe(changes => {
      this.listStateService.rowEntries = changes;
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  @HostListener('focusout', ['$event'])
  public onListBlur(event: FocusEvent) {
    const tableViewport = this.elementRef.nativeElement;

    if (!tableViewport.contains(event.relatedTarget)) {
      this.listStateService.lastFocused = null;
    }
  }

  @HostListener('focusin', ['$event'])
  public onListFocus(event: FocusEvent) {
    if (!this.listStateService.lastFocused) {
      this.focused.emit({ ev: event, item: this._selected || this.rowEntries.get(0).item });
    }
  }

  private handleFocus() {
    fromEvent(this.elementRef.nativeElement, 'keydown')
      .pipe(
        takeUntil(this.destroyed)
      ).subscribe((event: KeyboardEvent) => {        
        const selectedPasswordIndex = this.rowEntries
          .toArray()
          .indexOf(this.rowEntries.find(x => x.item === this.listStateService.selected));

        let entry: any;

        switch (event.key) {  
          case 'Tab':
            this.handleTabKeydown();
            break;
          case 'ArrowDown':
            if (selectedPasswordIndex === this.rowEntries.length - 1) {
              return;
            }

            entry = this.rowEntries.get(selectedPasswordIndex + 1).item;
            this.focused.emit({ ev: event, item: entry });
            break;
          case 'ArrowUp':
            if (selectedPasswordIndex === 0) {
              return;
            }

            entry = this.rowEntries.get(selectedPasswordIndex - 1).item;
            this.focused.emit({ ev: event, item: entry });
            break;
        }
      });
  }

  private handleTabKeydown() {
    if (this.rowEntries.find(x => x.elRef.nativeElement === document.activeElement)) {
      this.rowEntries.forEach(x => (x.elRef.nativeElement as HTMLElement).setAttribute('tabindex', "-1"));
  
      // navigate outside the list of entries on tab key and restore the ability to navigate on next render
      setTimeout(() => {
        this.rowEntries.forEach(x => (x.elRef.nativeElement as HTMLElement).setAttribute('tabindex', "0"));
      });
    }
  }
}
