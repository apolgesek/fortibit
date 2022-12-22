import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, QueryList } from '@angular/core';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { ListStateService } from '../services/list-state.service';
import { FocusableListItemDirective } from './focusable-list-item.directive';

interface ItemFocusedEvent {
  originalEvent: Event;
  item: any;
}

@Directive({
  selector: '[appFocusableList]',
  providers: [ListStateService],
  standalone: true,
  host: { 'role' : 'list' }
})
export class FocusableListDirective implements AfterViewInit, OnDestroy {
  @ContentChildren(FocusableListItemDirective, { descendants: true }) public readonly rowEntries: QueryList<FocusableListItemDirective>;
  @Output() private readonly focused: EventEmitter<ItemFocusedEvent> = new EventEmitter<ItemFocusedEvent>();
  private _selected: any;

  @Input()
  public focusOnLoad = false;
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

    this.rowEntries.changes
      .pipe(takeUntil(this.destroyed))
      .subscribe((changes: QueryList<FocusableListItemDirective>) => {
      // initial setup of list items tab indices
      if (!this.listStateService.rowEntries) {
        this.enableFocus(changes.first);
        if (this.focusOnLoad) {
          changes.first.elRef.nativeElement.focus();
        }

        for (const item of changes.toArray().slice(1)) {
          this.disableFocus(item);
        }

        return;
      }

      this.listStateService.rowEntries = changes;
      // reset state when list reloads
      changes.forEach(x => this.enableFocus(x));
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
      this.focused.emit({ originalEvent: event, item: this._selected ?? this.rowEntries.first.item });
    }
  }

  private handleFocus() {
    fromEvent(this.elementRef.nativeElement, 'keydown')
      .pipe(
        takeUntil(this.destroyed)
      ).subscribe((event: KeyboardEvent) => {        
        const selectedItemIndex = this.rowEntries
          .toArray()
          .indexOf(this.rowEntries.find(x => x.item === this.listStateService.selected));

        let entry: any;

        switch (event.key) {  
          case 'Tab':
            if (event.shiftKey) {
              return;
            }

            this.handleTabKeydown();
            break;
          case 'ArrowDown':
            if (selectedItemIndex === this.rowEntries.length - 1) {
              return;
            }

            entry = this.rowEntries.get(selectedItemIndex + 1).item;
            this.focused.emit({ originalEvent: event, item: entry });
            break;
          case 'ArrowUp':
            if (selectedItemIndex === 0) {
              return;
            }

            entry = this.rowEntries.get(selectedItemIndex - 1).item;
            this.focused.emit({ originalEvent: event, item: entry });
            break;
        }
      });
  }

  private handleTabKeydown() {   
    for (const entry of this.rowEntries) {
      this.disableFocus(entry);
    }

    const selectedItem = this.rowEntries.find(x => x.item === this._selected);
    this.enableFocus(selectedItem);
  }

  private enableFocus(item: FocusableListItemDirective): void {
    item.elRef.nativeElement.setAttribute('tabindex', '0');
  }

  private disableFocus(item: FocusableListItemDirective): void {
    item.elRef.nativeElement.setAttribute('tabindex', '-1');
  }
}
