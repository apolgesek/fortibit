import { AfterViewInit, ContentChildren, Directive, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, Optional, Output, QueryList, SkipSelf } from '@angular/core';
import { delay, filter, fromEvent, Subject, takeUntil } from 'rxjs';
import { DropdownStateService } from '../services/dropdown-state.service';
import { MenuService } from '../services/menu.service';
import { MenuItemDirective } from './menu-item.directive';

@Directive({
  selector: '[appDropdown]',
  providers: [DropdownStateService],
  standalone: true,
  exportAs: 'appDropdown'
})
export class DropdownDirective implements AfterViewInit, OnDestroy {
  @ContentChildren(MenuItemDirective, { descendants: true })
  public menuItems: QueryList<MenuItemDirective>;
  @Input() public select = false;
  public index: number;

  @Output() public open: EventEmitter<DropdownDirective> = new EventEmitter();
  @Output() public close: EventEmitter<DropdownDirective> = new EventEmitter();

  @HostBinding('class.open')
  public get isOpen(): boolean {
    return this.dropdownState.isOpen;
  }

  public get state(): DropdownStateService {
    return this.dropdownState;
  }

  private destroyed: Subject<void> = new Subject();
  private dropdownClosed: Subject<void> = new Subject();

  constructor(
    private readonly el: ElementRef,
    private readonly dropdownState: DropdownStateService,
    @SkipSelf() @Optional() private readonly parentDropdownState: DropdownStateService,
    @Optional() private readonly menuService: MenuService,
  ) {}

  enableKeyboardNavigation(): void {
    this.dropdownClosed = new Subject();

    fromEvent(this.el.nativeElement, 'keydown')
    .pipe(takeUntil(this.dropdownClosed))
    .subscribe((event: KeyboardEvent) => {
      event.stopPropagation();

      switch (event.key) {
        case 'ArrowDown':
          this.focusNext();
          break;
        case 'ArrowUp':
          this.focusPrevious();
          break;
        case 'ArrowRight':
          this.onRightArrowDown();
          break;
        case 'ArrowLeft':
          this.onLeftArrowDown();
          break;
        case 'Escape':
          this.dropdownState.closeAndFocusFirst();  
          break;
        default:
          break;
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.parentDropdownState) {
      this.dropdownState.parent = this.parentDropdownState;
      this.parentDropdownState.child = this.dropdownState;
    }

    this.menuItems.changes.pipe(delay(0), takeUntil(this.destroyed)).subscribe((items: QueryList<MenuItemDirective>) => {
      this.dropdownState.items = items.toArray();
    });

    this.dropdownState.stateChanges$.pipe(delay(0), filter(x => x.notifyChanges), takeUntil(this.destroyed)).subscribe(state => {
      if (state.isOpen) {  
        if (!this.select) {
          this.dropdownState.currentItem = this.menuItems.first;
        } else {
          this.dropdownState.currentItem = this.menuItems.find(x => x.nativeElement.classList.contains('selected')) ?? this.menuItems.first;
        }

        this.dropdownState.currentItem.focus();
        this.enableKeyboardNavigation();

        if (this.menuService) {
          this.menuService.focus(this);
        }

        this.open.emit(this);
      } else {
        if (this.dropdownClosed) {
          this.dropdownClosed.next();
          this.dropdownClosed.complete();
    
          this.dropdownClosed = null;
          this.close.emit(this);
        }
      }
    });

    this.dropdownState.focusFirstItem$.pipe(delay(0), takeUntil(this.destroyed)).subscribe(() => {
      this.dropdownState.currentItem = this.menuItems.get(1);
      this.dropdownState.currentItem.focus();
    });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  focusNext() {
    if (this.dropdownState.currentItem && this.dropdownState.currentItem.stateService !== this.dropdownState) {
      this.dropdownState.currentItem.stateService.currentItem = null;
    }
  
    const items = this.menuItems.toArray().filter(x => !x.isDisabled);
    const index = items.findIndex(x => x === this.dropdownState.currentItem);

    this.dropdownState.currentItem = index >= items.length - 1 ? items.at(1) : items.at(index + 1);
    this.dropdownState.currentItem.focus();

    if (this.dropdownState.currentItem.stateService !== this.dropdownState) {
      this.dropdownState.currentItem.stateService.currentItem = this.dropdownState.currentItem;
    }
  }

  focusPrevious() {
    if (this.dropdownState.currentItem &&  this.dropdownState.currentItem.stateService !== this.dropdownState) {
      this.dropdownState.currentItem.stateService.currentItem = null;
    }
  
    const items = this.menuItems.toArray().filter(x => !x.isDisabled);
    const index = items.findIndex(x => x === this.dropdownState.currentItem);

    this.dropdownState.currentItem = index <= 1 ? items.at(-1) : items.at(index - 1);
    this.dropdownState.currentItem.focus();

    if (this.dropdownState.currentItem.stateService !== this.dropdownState) {
      this.dropdownState.currentItem.stateService.currentItem = this.dropdownState.currentItem;
    }
  }

  onRightArrowDown() {
    const currentItemService = this.dropdownState.currentItem?.stateService;

    if (currentItemService && currentItemService !== this.dropdownState) {
      currentItemService.open();
      currentItemService.focusFirstItem();
    } else {
      if (this.menuService) {
        this.menuService.focusNext();
      }
    }
  }

  onLeftArrowDown() {
    if (this.dropdownState.parent) {
      this.dropdownState.parent.currentItem.focus();
      this.dropdownState.close();
    } else {
      if (this.menuService) {
        this.menuService.focusPrevious();
      }
    }
  }

  openDropdown() {
    this.dropdownState.open();
  }
}
