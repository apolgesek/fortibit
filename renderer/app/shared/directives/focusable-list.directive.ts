import { AfterViewInit, ContentChildren, DestroyRef, Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, QueryList } from '@angular/core';
import { fromEvent } from 'rxjs';
import { ListStateService } from '../services/list-state.service';
import { FocusableListItemDirective } from './focusable-list-item.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface ItemFocusedEvent {
  originalEvent: Event;
  item: any;
}

@Directive({
  selector: '[appFocusableList]',
  providers: [ListStateService],
  standalone: true,
})
export class FocusableListDirective implements AfterViewInit {
  @HostBinding('attr.role') public readonly role = 'list';
  @ContentChildren(FocusableListItemDirective, { descendants: true })
  public readonly rowEntries: QueryList<FocusableListItemDirective>;
  @Input()
  public focusOnLoad = false;
  @Output() private readonly focused: EventEmitter<ItemFocusedEvent> = new EventEmitter<ItemFocusedEvent>();
  private _selected: any;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly elementRef: ElementRef,
    private readonly listStateService: ListStateService
  ) { }

  @Input()
  public set selected(value: any[]) {
    this._selected = value ? value[0] : null;
    this.listStateService.selected = this._selected;

    if (this._selected && this.rowEntries) {
      const item = this.rowEntries.find(x => x.item === this._selected);
      if (item) {
        item.elRef.nativeElement.focus();
      }
    }
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

  ngAfterViewInit() {
    this.handleFocus();
    this.refresh(this.rowEntries);

    this.rowEntries.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changes: QueryList<FocusableListItemDirective>) => {
        this.refresh(changes);
      });
  }

  refresh(changes: QueryList<FocusableListItemDirective>) {
    if (!changes?.length) {
      return;
    }

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
  }

  private handleFocus() {
    fromEvent(this.elementRef.nativeElement, 'keydown')
      .pipe(
        takeUntilDestroyed(this.destroyRef)
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
