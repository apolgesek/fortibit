import { AfterViewInit, ContentChildren, Directive, ElementRef, HostBinding, Input, OnDestroy, Optional, QueryList } from '@angular/core';
import { filter, fromEvent, Subject, take, takeUntil } from 'rxjs';
import { DropdownStateService } from '../services/dropdown-state.service';
import { MenuService } from '../services/menu.service';
import { MenuItemDirective } from './menu-item.directive';

@Directive({
  selector: '[appDropdown]',
  providers: [DropdownStateService]
})
export class DropdownDirective implements AfterViewInit, OnDestroy {
  @Input() index;
  @ContentChildren(MenuItemDirective, { descendants: true })
  menuItems: QueryList<MenuItemDirective>;

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
    private readonly dropdownState: DropdownStateService,
    private readonly el: ElementRef,
    @Optional() private readonly menuService: MenuService,
  ) {}

  enableKeyboardNavigation(): void {
    this.dropdownClosed = new Subject();

    fromEvent(this.el.nativeElement, 'keydown')
    .pipe(takeUntil(this.dropdownClosed))
    .subscribe((event: KeyboardEvent) => {
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
          this.dropdownState.close();
          
          if (this.dropdownState.parent) {
            this.dropdownState.parent.currentItem.focus();
          }
  
          break;
        default:
          break;
      }

      event.stopPropagation();
    });
  }

  ngAfterViewInit(): void {
    this.dropdownState.stateChanges$.pipe(filter(x => x.notifyChanges), takeUntil(this.destroyed)).subscribe(state => {
      if (state.isOpen) {
        this.menuItems.changes.pipe(take(1)).subscribe((items: QueryList<MenuItemDirective>) => {
          setTimeout(() => {
            this.dropdownState.items = items.toArray();
            this.dropdownState.currentItem = items.get(0);
            this.dropdownState.currentItem.focus();
          });
        });
        
        this.enableKeyboardNavigation();

        if (this.menuService) {
          this.menuService.focus(this);
        }
      } else {
        if (this.dropdownClosed) {
          this.dropdownClosed.next();
          this.dropdownClosed.complete();
    
          this.dropdownClosed = undefined;
        }
      }
    });

    this.dropdownState.focusFirstItem$.pipe(takeUntil(this.destroyed)).subscribe(() => {
      setTimeout(() => {
        this.dropdownState.currentItem = this.menuItems.get(1);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  focusNext() {
    if (this.dropdownState.currentItem && this.dropdownState.currentItem.stateService !== this.dropdownState) {
      this.dropdownState.currentItem.stateService.currentItem = undefined;
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
      this.dropdownState.currentItem.stateService.currentItem = undefined;
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
      currentItemService.parent = this.dropdownState;
      this.dropdownState.child = currentItemService;
      currentItemService.open();

      setTimeout(() => {
        currentItemService.focusFirstItem();
      });
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
